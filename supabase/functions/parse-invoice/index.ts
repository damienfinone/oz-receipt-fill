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
    
    // Fraud Detection
    fraudScore?: number;
    fraudIndicators?: Array<{
      type: 'critical' | 'warning' | 'info';
      field: string;
      message: string;
      severity: number;
    }>;
    riskLevel?: 'low' | 'medium' | 'high';
    
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

    console.log('Processing invoice text with AI and fraud detection...');

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
            content: `You are an AI assistant that extracts structured data from Australian vehicle invoices and performs basic fraud detection analysis.

            Extract the following information from the provided text and perform fraud detection analysis:

            Financial Details:
            - totalCost: Total cost/price including GST (as string, numbers only)
            - deposit: Deposit amount if mentioned (as string, numbers only)
            - tradeInValue: Trade in value/allowance (as string, numbers only)
            - balanceOwing: Balance owing/payable amount (as string, numbers only)
            - purchasePrice: Purchase price/subtotal (as string, numbers only)
            - gstAmount: GST amount (as string, numbers only)
            
            Vehicle Details:
            - assetType: Type of asset (motor-vehicle, motorcycle, etc.)
            - bodyType: Body type (sedan, hatchback, SUV, wagon, coupe, convertible, ute, van, truck, etc.). If not explicitly stated, infer from vehicleMake, vehicleModel, and vehicleYear
            - vehicleMake: Car manufacturer (Toyota, Holden, Ford, BYD, Tesla, BMW, Mercedes, etc.)
            - vehicleModel: Model name (Camry, SEAL, Model 3, X5, etc.)
            - vehicleYear: Year (YYYY format)
            - transmission: Transmission type (automatic, manual, CVT, dual-clutch, etc.). If not explicitly stated, infer from vehicleMake, vehicleModel, and vehicleYear
            - fuelType: Fuel type (electric, petrol, diesel, hybrid, plug-in hybrid, etc.). If not explicitly stated, infer from vehicleMake, vehicleModel, and vehicleYear (e.g., BYD SEAL = electric, Tesla = electric)
            - color: Vehicle color
            - engineNumber: Engine number if available
            - odometer: Vehicle odometer reading in kilometers (as string, numbers only)
            - vin: Vehicle Identification Number (17 characters)
            - nvic: National Vehicle Identification Code
            - registration: Registration number (Rego No., Registration, Plate Number). Look carefully for partial registrations or reference numbers
            - state: Australian state (NSW, VIC, QLD, WA, SA, TAS, NT, ACT)
            
            Vendor Information:
            - vendorName: Business/dealer name
            - vendorAbn: Australian Business Number (format: XX XXX XXX XXX)
            
            Invoice Details:
            - purchaseDate: Date in YYYY-MM-DD format
            - invoiceNumber: Invoice/receipt number
            
            Customer Details:
            - deliverTo: Customer name or "Deliver To" address/name
            
            Bank Details:
            - bankName: Bank name for payments (e.g., ANZ, CBA, Westpac, NAB)
            - accountName: Bank account name
            - bsb: BSB number (6 digits, may have space or hyphen)
            - accountNumber: Bank account number
            - paymentReference: Payment reference number or code

            FRAUD DETECTION: Also analyze the document for potential fraud indicators:
            - Check if financial calculations are consistent (Balance Owing = Total Cost - Deposit - Trade In Value)
            - Verify GST is approximately 10% of total cost
            - Validate VIN format (should be 17 characters)
            - Check for realistic price ranges for vehicles
            - Identify any suspicious patterns or inconsistencies

            Return the data as a JSON object with the exact field names above. If a field cannot be found, use an empty string. Include a confidence score (0-100) for the overall extraction quality.

            Also provide fieldsWithLowConfidence as an array of field names where the extraction confidence is below 70%.

            For fraud detection, add these additional fields:
            - fraudScore: Overall document authenticity score (0-100, higher is more trustworthy)
            - fraudIndicators: Array of detected issues, each with:
              - type: "critical", "warning", or "info"
              - field: field name related to the issue
              - message: description of the issue
              - severity: number 1-10 indicating severity
            - riskLevel: "low", "medium", or "high" based on overall assessment

            Example response:
            {
              "data": {
                "totalCost": "45000",
                "gst": "4500",
                ... other fields ...
                "fraudScore": 92,
                "fraudIndicators": [
                  {
                    "type": "warning",
                    "field": "gstAmount",
                    "message": "GST calculation appears slightly off (expected ~10%)",
                    "severity": 3
                  }
                ],
                "riskLevel": "low"
              },
              "confidence": 85,
              "fieldsWithLowConfidence": ["engineNumber", "nvic"]
            }`
          },
          {
            role: "user",
            content: `Extract data and analyze for fraud from this Australian vehicle invoice text:\n\n${text}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
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

    console.log('Successfully parsed invoice data with fraud analysis:', parsed);

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