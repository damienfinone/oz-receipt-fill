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
    console.log('Text length:', text.length, 'characters');

    const aiStartTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          {
            role: "system",
            content: `Extract structured data from Australian vehicle invoices. Return ONLY valid JSON.

Financial: totalCost, deposit, purchasePrice, gstAmount
Vehicle: vehicleMake, vehicleModel, vehicleYear, bodyType, transmission, fuelType, color, vin, registration, state  
Vendor: vendorName, vendorAbn, purchaseDate, invoiceNumber
Customer: deliverTo
Bank: bankName, bsb, accountNumber

For fraud detection, add:
- fraudScore (0-100, higher = more trustworthy)
- fraudIndicators (array of issues)  
- riskLevel ("low"/"medium"/"high")

Return format:
{
  "data": {...all fields...},
  "confidence": 85,
  "fieldsWithLowConfidence": ["field1", "field2"]
}`
          },
          {
            role: "user", 
            content: `Extract data from this Australian vehicle invoice:\n\n${text.substring(0, 3000)}`
          }
        ],
        max_completion_tokens: 800
      }),
    });

    console.log(`OpenAI API call completed in ${Date.now() - aiStartTime}ms, status:`, response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      console.error('Request details - Model: gpt-5-mini-2025-08-07, Tokens: 800, Text length:', text.length);
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const completion = await response.json();
    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      console.error('Empty response from OpenAI:', completion);
      throw new Error('No response content from OpenAI');
    }

    console.log('OpenAI response:', responseText);

    // Clean response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```[a-z]*\s*/, '').replace(/\s*```$/, '');
    }

    // Parse JSON response
    const parsed: ParsedResult = JSON.parse(cleanedResponse);
    
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