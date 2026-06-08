globalThis.WebSocket = class {};
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijscgcpdfwlkgucjrmna.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2NnY3BkZndsa2d1Y2pybW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjEwNTcsImV4cCI6MjA5NjMzNzA1N30.jOR-LQLMA2JcBJ2PpxbEvgK2UPs5rtpLJgRRkBjyNs4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, status, elapsed, kick_off, raw_status')
    .order('kick_off', { ascending: true });

  if (error) {
    console.error("Error fetching matches:", error);
  } else {
    console.log(JSON.stringify(matches, null, 2));
  }
}

check();
