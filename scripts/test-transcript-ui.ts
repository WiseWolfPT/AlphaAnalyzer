#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestTranscript() {
  console.log('🚀 Creating test transcript for UI testing...');

  const testTranscript = {
    ticker: 'GOOGL',
    company_name: 'Alphabet Inc.',
    quarter: 'Q3',
    year: 2024,
    call_date: '2024-10-29T21:00:00Z',
    content: `
Operator: Good afternoon, ladies and gentlemen. Welcome to Alphabet's third quarter 2024 earnings conference call. At this time, all participants are in a listen-only mode. After the speakers' remarks, there will be a question-and-answer session.

Sundar Pichai, CEO: Thank you, operator. Good afternoon, everyone, and welcome to Alphabet's third quarter 2024 earnings call. I'm pleased to report another quarter of strong performance across the company.

Our total revenues grew 15% year-over-year to $88.3 billion, with Google Cloud revenues surpassing $11 billion for the first time. This growth was driven by continued strength in Search, YouTube, and our Cloud platform.

Let me start with AI, which continues to be our most significant investment area. Our Gemini models are now being used by millions of developers worldwide, and we're seeing incredible innovation across our products. Search with AI Overviews is now available in more than 100 countries, helping users get better answers faster.

Ruth Porat, CFO: Thank you, Sundar. Let me provide more detail on our financial results. As Sundar mentioned, total revenues were $88.3 billion, up 15% year-over-year, or 16% in constant currency.

Google Services revenues were $74.6 billion, up 13% year-over-year. Within Google Services, Search revenues grew 12% year-over-year to $49.4 billion, reflecting strong growth in retail and travel verticals.

YouTube advertising revenues were $8.9 billion, up 12% year-over-year. YouTube Shorts now has over 70 billion daily views, and we're seeing strong monetization improvements.

Google Cloud revenues were $11.4 billion, up 35% year-over-year, driven by strong growth in both infrastructure and platform services. Our AI offerings, including Vertex AI and Gemini for Workspace, are seeing rapid adoption.

Operating income was $28.5 billion, with an operating margin of 32%. We continue to invest heavily in technical infrastructure to support our AI initiatives while maintaining disciplined cost management.

Analyst 1: Thank you for the results. Can you provide more color on the AI infrastructure investments and how you're thinking about capacity planning?

Sundar Pichai, CEO: Great question. We're investing aggressively in our technical infrastructure, particularly in TPUs and data centers. We believe we have a significant advantage with our custom silicon, and our fifth-generation TPUs are showing impressive performance improvements.

Analyst 2: On Google Cloud, can you talk about the competitive dynamics and what's driving the acceleration in growth?

Thomas Kurian, CEO Google Cloud: We're seeing strong demand across industries for our AI platform. Vertex AI usage has grown 14x year-over-year, and our differentiated AI capabilities are helping us win new customers and expand with existing ones.

Operator: This concludes today's conference call. Thank you for participating.
    `,
    ai_summary: {
      summary: "Alphabet reported strong Q3 2024 results with total revenues of $88.3 billion (+15% YoY), driven by robust performance across Search, YouTube, and Cloud. Google Cloud exceeded $11 billion in quarterly revenue for the first time (+35% YoY), while maintaining healthy operating margins at 32%. AI initiatives, particularly Gemini models and Vertex AI, are seeing rapid adoption and driving growth across all segments.",
      key_insights: [
        "Google Cloud revenues surpassed $11 billion for the first time, growing 35% YoY with strong AI platform adoption",
        "Search revenues grew 12% YoY to $49.4 billion, with AI Overviews now available in 100+ countries",
        "YouTube Shorts reached 70 billion daily views with improving monetization metrics"
      ],
      financial_highlights: [
        "Revenue: $88.3 billion (+15% YoY, +16% constant currency) - beat consensus by 2.1%",
        "EPS: $2.12 GAAP / $2.45 non-GAAP (+37% YoY) - beat consensus by $0.29",
        "Operating Margin: 32% (+180bps YoY) - highest in 8 quarters",
        "Free Cash Flow: $17.6 billion (+28% YoY)",
        "Google Cloud: $11.4 billion (+35% YoY) - first time exceeding $11B quarterly"
      ],
      risks: [
        "Heavy AI infrastructure investments may pressure margins in near term",
        "Regulatory scrutiny continues across multiple jurisdictions",
        "Competition intensifying in cloud and AI services"
      ],
      outlook: "Management expressed confidence in sustained growth momentum driven by AI leadership. Q4 guidance implies 14-16% revenue growth with continued Cloud acceleration. Committed to disciplined investment approach balancing growth with profitability.",
      sentiment: "positive",
      stock_specific_metrics: [
        "Vertex AI usage: 14x YoY growth",
        "YouTube Shorts: 70 billion daily views",
        "AI Overviews: Available in 100+ countries",
        "TPU v5: Significant performance improvements highlighted"
      ]
    },
    financial_metrics: {
      revenue: {
        current_quarter: 88300000000,
        prior_year_quarter: 76700000000,
        yoy_growth_percent: 15.1,
        sequential_growth_percent: 8.2,
        by_segment: [
          { name: "Google Search", value: 49400000000, growth: 12 },
          { name: "YouTube Ads", value: 8900000000, growth: 12 },
          { name: "Google Cloud", value: 11400000000, growth: 35 },
          { name: "Other Google Services", value: 15200000000, growth: 10 }
        ],
        guidance_next_quarter: "14-16% growth expected",
        guidance_full_year: "$350-355 billion"
      },
      earnings: {
        gaap_eps: 2.12,
        non_gaap_eps: 2.45,
        consensus_estimate: 1.83,
        beat_miss_amount: 0.29,
        yoy_growth_percent: 37,
        net_income: 26300000000,
        adjusted_ebitda: 35800000000
      },
      margins: {
        gross_margin: 58.1,
        gross_margin_yoy_change: 1.2,
        operating_margin: 32.3,
        operating_margin_yoy_change: 1.8,
        net_margin: 29.8,
        ebitda_margin: 40.5
      },
      cash_flow: {
        operating_cash_flow: 30900000000,
        free_cash_flow: 17600000000,
        capex: 13300000000,
        cash_position: 93200000000,
        debt_position: 13800000000
      },
      guidance: {
        updated: true,
        direction: "raised",
        revenue_guidance: { q_next: "$90-92B", fy: "$350-355B" },
        eps_guidance: { q_next: "$2.20-2.35", fy: "$8.50-8.80" },
        key_assumptions: [
          "Continued AI adoption and monetization",
          "Cloud growth acceleration sustained",
          "Stable macroeconomic environment"
        ],
        confidence_level: "high"
      },
      operational_metrics: {
        customer_metrics: [
          { name: "Cloud Customers", value: "10M+", change: "+40%" },
          { name: "Workspace Users", value: "10M+ orgs", change: "+25%" }
        ],
        product_metrics: [
          { name: "Vertex AI Usage", value: "14x growth", change: "+1300%" },
          { name: "YouTube Shorts Views", value: "70B daily", change: "+50%" }
        ],
        efficiency_metrics: [
          { name: "Revenue per Employee", value: "$1.48M", change: "+8%" },
          { name: "Data Center Efficiency", value: "1.10 PUE", change: "-5%" }
        ]
      },
      stock_specific_kpis: [
        { name: "Search Market Share", value: "91.9%", yoy_change: "+0.5pp", context: "Maintaining dominance despite AI competition" },
        { name: "Cloud Market Share", value: "11%", yoy_change: "+2pp", context: "Gaining share from competitors" },
        { name: "AI Model Performance", value: "Gemini 1.5 Pro", yoy_change: "New", context: "Leading benchmarks in multiple categories" }
      ],
      management_highlights: [
        "AI investments are the top priority for capital allocation",
        "Seeing strong ROI from AI infrastructure investments",
        "Committed to responsible AI development and deployment"
      ],
      notable_comparisons: [
        { metric: "Revenue Growth", vs_consensus: "+2.1%", vs_prior_year: "+15.1%" },
        { metric: "Cloud Growth", vs_consensus: "+3%", vs_prior_year: "+35%" },
        { metric: "Operating Margin", vs_consensus: "+120bps", vs_prior_year: "+180bps" }
      ]
    },
    status: 'published',
    ai_status: 'completed'
  };

  // Delete existing test transcript if it exists
  const { error: deleteError } = await supabase
    .from('transcripts')
    .delete()
    .eq('ticker', 'GOOGL')
    .eq('quarter', 'Q3')
    .eq('year', 2024);

  if (deleteError && deleteError.code !== 'PGRST116') {
    console.error('❌ Error deleting existing transcript:', deleteError);
  }

  // Insert new test transcript
  const { data, error } = await supabase
    .from('transcripts')
    .insert(testTranscript)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating transcript:', error);
    return;
  }

  console.log('✅ Test transcript created successfully!');
  console.log('📊 Transcript ID:', data.id);
  console.log('🔗 Test URL: http://localhost:3000/transcript/GOOGL-2024-Q3');
  console.log('\n📝 The transcript includes:');
  console.log('   - Enhanced typography and spacing');
  console.log('   - Speaker identification');
  console.log('   - Financial metrics extraction');
  console.log('   - Stock-specific KPIs');
  console.log('   - Comprehensive AI analysis');
}

createTestTranscript()
  .then(() => {
    console.log('\n✨ Test transcript ready for UI testing!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });