import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedResult {
  data: {
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    vin?: string;
    purchasePrice?: string;
    gstAmount?: string;
    vendorName?: string;
    vendorAbn?: string;
    purchaseDate?: string;
    invoiceNumber?: string;
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
            1. The extracted data in the specified format
            2. A confidence score (0-100) for the overall extraction
            3. A list of field names where confidence is below 80%

            Expected fields:
            - vehicleMake: Car manufacturer (Toyota, Holden, Ford, etc.)
            - vehicleModel: Model name
            - vehicleYear: Year (YYYY format)
            - vin: Vehicle Identification Number (17 characters)
            - purchasePrice: Total purchase amount (numbers only, no currency symbols)
            - gstAmount: GST amount (numbers only)
            - vendorName: Business/dealer name
            - vendorAbn: Australian Business Number (format: XX XXX XXX XXX)
            - purchaseDate: Date in YYYY-MM-DD format
            - invoiceNumber: Invoice/receipt number

            For Australian formats:
            - Dates can be DD/MM/YYYY or DD-MM-YYYY (convert to YYYY-MM-DD)
            - ABN format: XX XXX XXX XXX (11 digits with spaces)
            - Currency amounts: remove $ and commas, keep decimal points
            
            Return ONLY a JSON object with this structure:
            {
              "data": { extracted fields here },
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