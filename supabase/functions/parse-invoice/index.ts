import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedResult {
  data: {
    // Financial
    totalCost?: string;
    deposit?: string;
    tradeInValue?: string;
    balanceOwing?: string;
    purchasePrice?: string;
    gstAmount?: string;
    
    // Vehicle Details
    assetType?: string;
    bodyType?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    transmission?: string;
    fuelType?: string;
    color?: string;
    engineNumber?: string;
    odometer?: string;
    
    // Identification
    vin?: string;
    nvic?: string;
    registration?: string;
    state?: string;
    
    // Vendor & Invoice
    vendorName?: string;
    vendorAbn?: string;
    purchaseDate?: string;
    invoiceNumber?: string;
    
    // Customer Details
    deliverTo?: string;
    
    // Bank Details
    bankName?: string;
    accountName?: string;
    bsb?: string;
    accountNumber?: string;
    paymentReference?: string;
  };
  confidence: number;
  fieldsWithLowConfidence: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text } = await req.json();
    
    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing invoice text with AI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting structured data from Australian vehicle invoices and tax invoices. 
            
            Extract the following information from the invoice text and return a JSON response with:
            1. The extracted data in a FLAT structure (not grouped)
            2. A confidence score (0-100) for the overall extraction
            3. A list of field names where confidence is below 80%

            Extract these fields as STRING values in a flat structure:
            - totalCost: Total cost including all charges (as string, numbers only, no currency symbols)
            - deposit: Deposit amount if mentioned (as string, numbers only)
            - tradeInValue: Trade in value/allowance (as string, numbers only)
            - balanceOwing: Balance owing/payable amount (as string, numbers only)
            - purchasePrice: Purchase price/subtotal (as string, numbers only, no currency symbols)
            - gstAmount: GST amount (as string, numbers only)
            - assetType: Type of asset (motor-vehicle, motorcycle, etc.)
            - bodyType: Body type (sedan, hatchback, SUV, wagon, coupe, convertible, ute, van, truck, etc.). If not explicitly stated, infer from vehicleMake, vehicleModel, and vehicleYear
            - vehicleMake: Car manufacturer (Toyota, Holden, Ford, BYD, Tesla, BMW, Mercedes, etc.)
            - vehicleModel: Model name (Camry, SEAL, Model 3, X5, etc.)
            - vehicleYear: Year (YYYY format)
            - transmission: Transmission type (automatic, manual, CVT, dual-clutch, etc.). If not explicitly stated, infer from vehicleMake, vehicleModel, and vehicleYear (most modern cars are automatic)
            - fuelType: Fuel type (electric, petrol, diesel, hybrid, plug-in hybrid, etc.). If not explicitly stated, infer from vehicleMake, vehicleModel, and vehicleYear (e.g., BYD SEAL = electric, Tesla = electric)
            - color: Vehicle color
            - engineNumber: Engine number if available
            - odometer: Vehicle odometer reading in kilometers (as string, numbers only)
            - vin: Vehicle Identification Number (17 characters)
            - nvic: National Vehicle Identification Code
            - registration: Registration number (Rego No., Registration, Plate Number). Look carefully for partial registrations or reference numbers
            - state: Australian state (NSW, VIC, QLD, WA, SA, TAS, NT, ACT)
            - vendorName: Business/dealer name
            - vendorAbn: Australian Business Number (format: XX XXX XXX XXX)
            - purchaseDate: Date in YYYY-MM-DD format
            - invoiceNumber: Invoice/receipt number
            - deliverTo: Customer name or "Deliver To" address/name
            - bankName: Bank name for payments (e.g., ANZ, CBA, Westpac, NAB)
            - accountName: Bank account name
            - bsb: BSB number (6 digits, may have space or hyphen)
            - accountNumber: Bank account number
            - paymentReference: Payment reference number or code

            INFERENCE RULES:
            - BYD models (SEAL, ATTO 3, DOLPHIN) = Electric vehicle, typically sedan/SUV/hatchback respectively
            - Tesla models = Electric vehicle, Model 3/S = sedan, Model X/Y = SUV
            - Most vehicles 2020+ are automatic transmission unless specified as manual
            - Hybrid vehicles often have "Hybrid" in model name or specifications
            
            IMPORTANT VALIDATION:
            - Ensure all currency amounts are formatted as strings with 2 decimal places (e.g., "56180.66")
            - Calculate and verify: Balance Owing should equal Total Cost - Deposit - Trade in Value
            - If the calculation doesn't match exactly, use the explicitly stated balance owing amount
            - If a field cannot be found or determined, return an empty string ""
            - For confidence scoring, be conservative - only give high confidence (>80) when you're very certain
            
            Return ONLY a JSON object with this FLAT structure (do not group fields):
            {
              "data": {
                "totalCost": "string value",
                "assetType": "string value", 
                "vehicleMake": "string value",
                "deliverTo": "string value",
                "bankName": "string value",
                "paymentReference": "string value"
              },
              "confidence": number,
              "fieldsWithLowConfidence": ["fieldName1", "fieldName2"]
            }`
          },
          {
            role: "user",
            content: `Extract data from this Australian vehicle invoice text:\n\n${text}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const completion = await response.json();
    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response:', responseText);

    // Parse JSON response
    const parsed: ParsedResult = JSON.parse(responseText);
    
    // Validate response structure
    if (!parsed.data || typeof parsed.confidence !== 'number') {
      throw new Error('Invalid response format from OpenAI');
    }

    console.log('Successfully parsed invoice data:', parsed);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-invoice function:', error);
    
    // Return fallback result with low confidence
    const fallbackResult: ParsedResult = {
      data: {},
      confidence: 0,
      fieldsWithLowConfidence: []
    };

    return new Response(JSON.stringify(fallbackResult), {
      status: 200, // Return 200 so the client can handle the fallback
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});