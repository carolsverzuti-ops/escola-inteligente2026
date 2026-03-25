import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://meozprygfkssbqrmnyhw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lb3pwcnlnZmtzc2Jxcm1ueWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDM2MzUsImV4cCI6MjA4OTk3OTYzNX0.MEnnS5Nu7nac1qrHx-8Q1H7B-_IP3RX2Ay2AMNXhTNY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
