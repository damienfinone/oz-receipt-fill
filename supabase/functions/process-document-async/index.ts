import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, fileData, fileName, fileType, hasTextLayer } = await req.json();
    
    console.log(`Starting async processing for job ${jobId}, hasTextLayer: ${hasTextLayer}`);
    
    // Update job to processing
    await supabase
      .from('jobs')
      .update({
        status: 'processing',
        stage: 'extract',
        progress: 10,
        elapsed_ms: 0
      })
      .eq('job_id', jobId);

    let text = '';
    const startTime = Date.now();

    try {
      if (hasTextLayer && fileType.includes('pdf')) {
        // Use PDF text extraction (would need PDF.js or similar)
        console.log('Extracting text from PDF text layer');
        // For now, simulate text extraction
        text = 'Simulated PDF text extraction...';
      } else {
        // Use OCR processing
        console.log('Using OCR for text extraction');
        // For now, simulate OCR
        text = 'Simulated OCR text extraction...';
      }

      await supabase
        .from('jobs')
        .update({
          stage: 'analyze',
          progress: 50,
          elapsed_ms: Date.now() - startTime
        })
        .eq('job_id', jobId);

      // Process with OpenAI if available
      let result = null;
      let confidence = 0;

      if (openAIApiKey && text) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert at extracting structured data from Australian vehicle invoices and tax invoices.

Extract the following fields from the invoice text and return them as a JSON object:

Financial Information:
- totalCost: Total amount including GST
- purchasePrice: Subtotal before GST  
- gstAmount: GST amount
- deposit: Any deposit paid

Vehicle Information:
- vehicleMake: Vehicle manufacturer
- vehicleModel: Vehicle model name
- vehicleYear: Year of manufacture
- bodyType: Body type (sedan, hatchback, SUV, etc.)
- transmission: Transmission type
- fuelType: Fuel type
- color: Vehicle color
- engineNumber: Engine number
- vin: Vehicle Identification Number (17 characters)

Identification:
- registration: Registration number
- state: Australian state (NSW, VIC, QLD, etc.)
- nvic: National Vehicle Identification Code

Vendor & Invoice:
- vendorName: Business name
- vendorAbn: Australian Business Number
- invoiceNumber: Invoice number
- purchaseDate: Purchase date (YYYY-MM-DD format)

Return ONLY a valid JSON object with these fields. Set any missing fields to empty string "".`
              },
              {
                role: 'user',
                content: text
              }
            ],
            max_tokens: 1000,
            temperature: 0.1
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0].message.content.trim();
          
          // Clean up the response (remove markdown code blocks if present)
          const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
          
          try {
            result = JSON.parse(cleanedContent);
            confidence = 85; // AI processing confidence
          } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            throw new Error('Invalid AI response format');
          }
        } else {
          throw new Error('OpenAI API request failed');
        }
      }

      // If no AI result, create a fallback result
      if (!result) {
        result = {
          totalCost: '',
          purchasePrice: '',
          gstAmount: '',
          deposit: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleYear: '',
          bodyType: '',
          transmission: '',
          fuelType: '',
          color: '',
          engineNumber: '',
          vin: '',
          registration: '',
          state: '',
          nvic: '',
          vendorName: '',
          vendorAbn: '',
          invoiceNumber: '',
          purchaseDate: ''
        };
        confidence = 30; // Low confidence for fallback
      }

      const elapsedMs = Date.now() - startTime;

      // Save result
      await supabase
        .from('results')
        .insert({
          job_id: jobId,
          extracted_data: result,
          confidence,
          schema_version: '1.0'
        });

      // Update job to completed
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          stage: 'complete',
          progress: 100,
          elapsed_ms: elapsedMs
        })
        .eq('job_id', jobId);

      console.log(`Completed async processing for job ${jobId} in ${elapsedMs}ms`);

    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_code: 'PROCESSING_ERROR',
          error_message: processingError.message,
          elapsed_ms: Date.now() - startTime
        })
        .eq('job_id', jobId);
      
      throw processingError;
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in async processing:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});