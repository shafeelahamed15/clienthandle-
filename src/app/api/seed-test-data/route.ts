import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🌱 Seeding test data for user:', user.id);

    // Test clients data
    const testClients = [
      {
        owner_uid: user.id,
        name: 'Sarah Johnson',
        email: 'sarah@techstartup.com',
        phone: '+1 (555) 123-4567',
        company: 'TechStartup Inc',
        notes: 'Prefers email communication. Works on mobile app projects.'
      },
      {
        owner_uid: user.id,
        name: 'David Chen',
        email: 'david@designagency.com',
        phone: '+1 (555) 987-6543',
        company: 'Creative Design Agency',
        notes: 'Frequent client, loves detailed mockups.'
      },
      {
        owner_uid: user.id,
        name: 'Emily Rodriguez',
        email: 'emily@consulting.com',
        phone: '+1 (555) 456-7890',
        company: 'Business Consulting LLC',
        notes: 'Needs quarterly reports and analysis.'
      },
      {
        owner_uid: user.id,
        name: 'Michael Thompson',
        email: 'mike@ecommerce.shop',
        company: 'E-commerce Solutions',
        notes: 'Building an online store platform.'
      },
      {
        owner_uid: user.id,
        name: 'Lisa Park',
        email: 'lisa@healthcare.org',
        phone: '+1 (555) 321-9876',
        company: 'Healthcare Solutions',
        notes: 'Works on patient management systems.'
      }
    ];

    // Insert test clients
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .insert(testClients)
      .select('id, name');

    if (clientsError) {
      console.error('❌ Error inserting clients:', clientsError);
      return NextResponse.json(
        { error: 'Failed to create test clients', details: clientsError.message },
        { status: 500 }
      );
    }

    console.log('✅ Created test clients:', clientsData);

    // Create test invoices for some clients
    if (clientsData && clientsData.length > 0) {
      const testInvoices = [
        {
          owner_uid: user.id,
          client_id: clientsData[0].id,
          number: 'INV-2024-001',
          currency: 'USD',
          amount_cents: 250000, // $2,500
          status: 'sent',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
          line_items: [
            {
              description: 'Mobile App Development - Phase 1',
              qty: 1,
              unit_price_cents: 250000,
              total_cents: 250000
            }
          ]
        },
        {
          owner_uid: user.id,
          client_id: clientsData[1].id,
          number: 'INV-2024-002',
          currency: 'USD',
          amount_cents: 180000, // $1,800
          status: 'overdue',
          due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          line_items: [
            {
              description: 'Website Design & Development',
              qty: 1,
              unit_price_cents: 180000,
              total_cents: 180000
            }
          ]
        }
      ];

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .insert(testInvoices)
        .select('id, number');

      if (invoicesError) {
        console.error('❌ Error inserting invoices:', invoicesError);
      } else {
        console.log('✅ Created test invoices:', invoicesData);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test data seeded successfully',
      clients: clientsData?.length || 0,
      invoices: 2
    });

  } catch (error) {
    console.error('❌ Seed test data error:', error);
    return NextResponse.json(
      { error: 'Failed to seed test data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}