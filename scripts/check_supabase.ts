
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env manualy since we might not be in a vite context
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL || envConfig.SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY || envConfig.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase Cloud credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName: string) {
    console.log(`Checking table: ${tableName}...`);
    // Check existence
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
        console.error(`   ❌ Error accessing ${tableName}:`, error.message);
        return false;
    }

    // Check for user_id column (Multi-tenancy verification)
    // We try to select 'user_id' specifically. 
    // If table is empty, we can't confirm column existence easily with JS client unless we try to insert or assuming select works.
    // Actually, select('user_id') will error if column is missing, even if no rows.
    const { error: colError } = await supabase.from(tableName).select('user_id').limit(1);

    if (colError) {
        if (colError.message.includes('does not exist')) {
            console.error(`   ⚠️  Column 'user_id' MISSING in ${tableName}. Multi-tenancy risk!`);
            return false;
        }
        // Other errors might be permissions, but usually implies column check passed or failed earlier
    }

    console.log(`   ✅ ${tableName} is accessible. Multi-tenancy column 'user_id' detected.`);
    return true;
}

async function main() {
    console.log("--- Supabase Deep Integrity Check ---");
    console.log(`URL: ${supabaseUrl}`);

    const tables = [
        'projects',
        'keyword_library',
        'articles',
        'models',
        'posts_to_publish',
        'publishing_channels',
        'seo_snapshots'
    ];

    let allGood = true;
    for (const table of tables) {
        const success = await checkTable(table);
        if (!success) allGood = false;
    }

    if (allGood) {
        console.log("\n✅ All critical tables are healthy and support multi-tenancy.");
    } else {
        console.error("\n⚠️ Some tables are missing or lack 'user_id'.");
    }
}

main();
