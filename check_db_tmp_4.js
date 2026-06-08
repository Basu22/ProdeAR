globalThis.WebSocket = class {};
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijscgcpdfwlkgucjrmna.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2NnY3BkZndsa2d1Y2pybW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjEwNTcsImV4cCI6MjA5NjMzNzA1N30.jOR-LQLMA2JcBJ2PpxbEvgK2UPs5rtpLJgRRkBjyNs4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("--- Competitions ---");
  const { data: competitions, error: errComp } = await supabase.from('competitions').select('*');
  if (errComp) console.error("Error competitions:", errComp.message);
  else console.log(competitions);

  console.log("--- Users ---");
  const { data: users, error: errUsers } = await supabase.from('users').select('*');
  if (errUsers) console.error("Error users:", errUsers.message);
  else console.log(users);

  console.log("--- Tournaments ---");
  const { data: tournaments, error: errTournaments } = await supabase.from('tournaments').select('*');
  if (errTournaments) console.error("Error tournaments:", errTournaments.message);
  else console.log(tournaments);
}

check();

