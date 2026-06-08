globalThis.WebSocket = class {};
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = 'https://ijscgcpdfwlkgucjrmna.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2NnY3BkZndsa2d1Y2pybW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjEwNTcsImV4cCI6MjA5NjMzNzA1N30.jOR-LQLMA2JcBJ2PpxbEvgK2UPs5rtpLJgRRkBjyNs4';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function run() {
  const email = `test_admin_${Date.now()}@prodear.app`;
  const password = 'TestPassword123';

  console.log("1. Signing up temporary test user...");
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: 'Test Admin User',
        avatar_url: null
      }
    }
  });

  if (signUpError) {
    console.error("Sign up error:", signUpError.message);
    return;
  }

  const user = signUpData.user;
  console.log("Sign up success. User ID:", user.id);

  console.log("2. Verifying if user exists in public.users...");
  // Wait a moment for trigger to run
  await new Promise(r => setTimeout(r, 2000));
  
  const { data: publicUser, error: pubUserError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (pubUserError) {
    console.error("Error checking public.users:", pubUserError.message);
  } else {
    console.log("Public user profile found:", publicUser);
  }

  console.log("3. Fetching competitions...");
  const { data: competitions, error: compError } = await supabase
    .from('competitions')
    .select('*');

  if (compError) {
    console.error("Error fetching competitions:", compError.message);
    return;
  }

  console.log("Competitions available:", competitions);

  if (competitions.length === 0) {
    console.error("No competitions found in DB!");
    return;
  }

  const compId = competitions[0].id;
  console.log(`Using competition ID: ${compId}`);

  console.log("4. Attempting to insert tournament...");
  const code = 'AR-TEST';
  const { data: tournament, error: insertError } = await supabase
    .from('tournaments')
    .insert({
      owner_id: user.id,
      competition_id: compId,
      name: 'Fincas Test',
      code,
      invite_link: `http://localhost:5173/join?code=${code}`,
      status: 'active'
    })
    .select()
    .maybeSingle();

  if (insertError) {
    console.error("Tournament insert error details:", insertError);
    return;
  }

  console.log("Tournament created successfully:", tournament);

  console.log("5. Attempting to add owner as admin member...");
  const { error: memberError } = await supabase
    .from('tournament_members')
    .insert({
      tournament_id: tournament.id,
      user_id: user.id,
      role: 'admin',
      total_points: 0,
      rank: 1
    });

  if (memberError) {
    console.error("Member insert error details:", memberError);
    return;
  }

  console.log("Admin member added successfully!");
}

run();
