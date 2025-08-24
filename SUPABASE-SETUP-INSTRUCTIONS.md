# Supabase Setup Instructions for Alfalyzer

## Phase 1, Day 4: Database Schema Setup

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com
2. Login to your Supabase account
3. Select your Alfalyzer project (or create one if doesn't exist)

### Step 2: Run Database Schema
1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy ALL content from `supabase-schema.sql` file
4. Paste into the SQL editor
5. Click **Run** button
6. You should see "Success" message

### Step 3: Verify Tables Created
1. Go to **Table Editor** (left sidebar)
2. You should see these tables:
   - users_metadata
   - watchlists
   - portfolios
   - price_alerts
   - cache_quotes

### Step 4: Verify Row Level Security
1. Click on each table
2. Look for "RLS enabled" badge (shield icon)
3. Click on "RLS" to see policies
4. Each table should have policies for user access

### Step 5: Configure Google OAuth (Optional - for Google login)
1. Go to **Authentication** → **Providers**
2. Find **Google** in the list
3. Toggle it ON
4. You'll need:
   - Client ID from Google Cloud Console
   - Client Secret from Google Cloud Console
5. Save configuration

### Step 6: Test Authentication Flow
Run these commands locally to test:

```bash
# 1. Start the development server
npm run dev

# 2. Test endpoints with curl:

# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' \
  -c cookies.txt

# Test authenticated endpoint
curl http://localhost:3001/api/auth/me \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt
```

### Step 7: Environment Variables Check
Make sure your `.env` file has these Supabase variables:

```env
# Supabase Configuration
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ... (your anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (your service role key)
```

### Step 8: Enable Email Confirmation (Optional)
1. Go to **Authentication** → **Settings**
2. Under **Email Auth**:
   - Enable email confirmations: ON/OFF as needed
   - For testing, you might want to disable it temporarily

### Step 9: Database Functions (Optional Advanced Features)
If you want automatic portfolio calculations, run this additional SQL:

```sql
-- Function to calculate portfolio holdings after transactions
CREATE OR REPLACE FUNCTION calculate_holdings(p_portfolio_id UUID)
RETURNS TABLE (
  symbol TEXT,
  quantity DECIMAL,
  avg_cost DECIMAL,
  total_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.symbol,
    SUM(CASE 
      WHEN t.type = 'buy' THEN t.quantity
      WHEN t.type = 'sell' THEN -t.quantity
    END) as quantity,
    CASE 
      WHEN SUM(CASE WHEN t.type = 'buy' THEN t.quantity ELSE 0 END) > 0
      THEN SUM(CASE WHEN t.type = 'buy' THEN t.quantity * t.price ELSE 0 END) / 
           SUM(CASE WHEN t.type = 'buy' THEN t.quantity ELSE 0 END)
      ELSE 0
    END as avg_cost,
    SUM(CASE 
      WHEN t.type = 'buy' THEN t.quantity * t.price
      WHEN t.type = 'sell' THEN -t.quantity * t.price
    END) as total_cost
  FROM transactions t
  WHERE t.portfolio_id = p_portfolio_id
  GROUP BY t.symbol
  HAVING SUM(CASE 
    WHEN t.type = 'buy' THEN t.quantity
    WHEN t.type = 'sell' THEN -t.quantity
  END) > 0;
END;
$$ LANGUAGE plpgsql;
```

### Troubleshooting

#### If tables don't create:
- Check for syntax errors in SQL
- Make sure you're using the correct database
- Try creating tables one by one

#### If RLS policies fail:
- Make sure you have auth.users table (comes with Supabase Auth)
- Check that auth.uid() function is available

#### If authentication doesn't work:
- Verify Supabase keys in .env file
- Check that cookies are being set in browser
- Verify CORS settings allow your domain

### Success Criteria
✅ All 5 tables created  
✅ RLS enabled on all tables  
✅ Policies created for user access  
✅ Can register a new user  
✅ Can login and receive httpOnly cookie  
✅ Authenticated requests work  

## Next Steps
After completing database setup:
1. Test user registration and login
2. Create a test watchlist
3. Add stocks to watchlist
4. Verify RLS is working (users can only see their own data)

Then proceed to Phase 2: Connect Real Data to UI