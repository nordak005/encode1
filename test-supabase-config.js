// Quick test script to verify Supabase configuration
// Run with: node test-supabase-config.js

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n=== Supabase Configuration Check ===\n');

if (!supabaseUrl) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL is missing');
} else {
  console.log('✓ NEXT_PUBLIC_SUPABASE_URL found');
  console.log('  Value:', supabaseUrl.substring(0, 30) + '...');
  console.log('  Length:', supabaseUrl.length);
  console.log('  Is placeholder?', supabaseUrl.includes('your-project'));
  
  // Validate URL format
  try {
    const url = new URL(supabaseUrl);
    console.log('  ✓ Valid URL format');
    console.log('  Domain:', url.hostname);
  } catch (e) {
    console.log('  ❌ Invalid URL format:', e.message);
  }
}

console.log('');

if (!supabaseKey) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
} else {
  console.log('✓ NEXT_PUBLIC_SUPABASE_ANON_KEY found');
  console.log('  Length:', supabaseKey.length);
  console.log('  Is placeholder?', supabaseKey.includes('your-anon'));
  console.log('  First 20 chars:', supabaseKey.substring(0, 20) + '...');
  
  if (supabaseKey.length < 50) {
    console.log('  ⚠️  Warning: Key seems too short (should be ~100+ characters)');
  } else {
    console.log('  ✓ Key length looks good');
  }
}

console.log('\n=== Summary ===\n');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Configuration incomplete');
  process.exit(1);
} else if (supabaseUrl.includes('your-project') || supabaseKey.includes('your-anon')) {
  console.log('❌ Placeholder values detected - please update .env.local');
  process.exit(1);
} else {
  console.log('✓ Configuration looks good!');
  console.log('\n⚠️  Remember to restart your Next.js server after updating .env.local');
  console.log('   Run: npm run dev\n');
}

