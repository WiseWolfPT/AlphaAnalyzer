CREATE TYPE "public"."billing_interval_enum" AS ENUM('month', 'year', 'lifetime');--> statement-breakpoint
CREATE TYPE "public"."market_cap_tier_enum" AS ENUM('nano', 'micro', 'small', 'mid', 'large', 'mega');--> statement-breakpoint
CREATE TYPE "public"."subscription_status_enum" AS ENUM('trial', 'active', 'past_due', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier_enum" AS ENUM('free', 'premium', 'whop_community', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."transaction_type_enum" AS ENUM('buy', 'sell', 'dividend', 'split', 'merger', 'spinoff');--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"api_key_id" varchar(255),
	"requests_count" integer DEFAULT 1,
	"response_time_ms" integer,
	"status_code" integer,
	"error_message" text,
	"rate_limit_window" varchar(20),
	"rate_limit_remaining" integer,
	"created_at" timestamp DEFAULT now(),
	"window_start" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" varchar(255),
	"ip_address" "inet",
	"user_agent" text,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" varchar(255),
	"old_values" jsonb,
	"new_values" jsonb,
	"request_id" varchar(255),
	"endpoint" varchar(255),
	"method" varchar(10),
	"status_code" integer,
	"compliance_reason" varchar(100),
	"data_classification" varchar(50) DEFAULT 'internal',
	"retention_period_days" integer DEFAULT 2555,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cache_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" varchar(255) NOT NULL,
	"cache_value" jsonb NOT NULL,
	"cache_type" varchar(50) NOT NULL,
	"ttl_seconds" integer NOT NULL,
	"tags" varchar(255)[],
	"hit_count" integer DEFAULT 0,
	"last_hit_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "cache_entries_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "data_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data_type" varchar(50) NOT NULL,
	"data_identifier" varchar(255),
	"access_reason" varchar(100),
	"ip_address" "inet",
	"user_agent" text,
	"session_id" varchar(255),
	"request_id" varchar(255),
	"authorized" boolean DEFAULT true,
	"authorization_method" varchar(50),
	"data_sensitivity" varchar(20) DEFAULT 'public',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enhanced_stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"change" numeric(10, 2) NOT NULL,
	"change_percent" numeric(5, 2) NOT NULL,
	"market_cap" text NOT NULL,
	"sector_id" integer,
	"industry_id" integer,
	"country" varchar(2),
	"exchange" varchar(10),
	"currency" varchar(3) DEFAULT 'USD',
	"market_cap_tier" "market_cap_tier_enum",
	"is_active" boolean DEFAULT true,
	"dividend_yield" numeric(5, 4),
	"beta" numeric(10, 4),
	"sector" text,
	"industry" text,
	"eps" numeric(10, 2),
	"pe_ratio" numeric(10, 2),
	"logo" text,
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "enhanced_stocks_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "enhanced_watchlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"category" varchar(50),
	"sort_order" integer DEFAULT 0,
	"color" varchar(7),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"quantity" numeric(15, 6) NOT NULL,
	"average_cost_cents" bigint NOT NULL,
	"current_price_cents" bigint,
	"market_value_cents" bigint,
	"unrealized_pnl_cents" bigint DEFAULT 0,
	"realized_pnl_cents" bigint DEFAULT 0,
	"weight_percent" numeric(5, 2),
	"day_change_cents" bigint DEFAULT 0,
	"day_change_percent" numeric(10, 4) DEFAULT '0',
	"first_purchase_date" date,
	"last_transaction_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_portfolio_symbol" UNIQUE("portfolio_id","symbol")
);
--> statement-breakpoint
CREATE TABLE "portfolio_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"transaction_type" "transaction_type_enum" NOT NULL,
	"quantity" numeric(15, 6) NOT NULL,
	"price_cents" bigint NOT NULL,
	"fees_cents" bigint DEFAULT 0,
	"total_amount_cents" bigint NOT NULL,
	"transaction_date" date NOT NULL,
	"notes" text,
	"broker" varchar(50),
	"account_id" varchar(100),
	"reference_id" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"currency" varchar(3) DEFAULT 'USD',
	"is_default" boolean DEFAULT false,
	"is_public" boolean DEFAULT false,
	"benchmark_symbol" varchar(10) DEFAULT 'SPY',
	"total_value_cents" bigint DEFAULT 0,
	"total_cost_cents" bigint DEFAULT 0,
	"total_return_cents" bigint DEFAULT 0,
	"total_return_percent" numeric(10, 4) DEFAULT '0',
	"day_change_cents" bigint DEFAULT 0,
	"day_change_percent" numeric(10, 4) DEFAULT '0',
	"beta" numeric(10, 4),
	"sharpe_ratio" numeric(10, 4),
	"volatility" numeric(10, 4),
	"max_drawdown" numeric(10, 4),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "unique_user_portfolio_name" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "stock_fundamentals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"fiscal_year" integer NOT NULL,
	"fiscal_quarter" integer,
	"revenue_cents" bigint,
	"gross_profit_cents" bigint,
	"operating_income_cents" bigint,
	"net_income_cents" bigint,
	"eps" numeric(10, 4),
	"total_assets_cents" bigint,
	"total_debt_cents" bigint,
	"shareholders_equity_cents" bigint,
	"book_value_per_share" numeric(10, 4),
	"operating_cash_flow_cents" bigint,
	"free_cash_flow_cents" bigint,
	"capital_expenditures_cents" bigint,
	"pe_ratio" numeric(10, 4),
	"pb_ratio" numeric(10, 4),
	"debt_to_equity" numeric(10, 4),
	"roe" numeric(10, 4),
	"roa" numeric(10, 4),
	"current_ratio" numeric(10, 4),
	"report_date" date,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_symbol_year_quarter" UNIQUE("symbol","fiscal_year","fiscal_quarter")
);
--> statement-breakpoint
CREATE TABLE "subscription_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"old_tier" "subscription_tier_enum",
	"new_tier" "subscription_tier_enum" NOT NULL,
	"old_status" "subscription_status_enum",
	"new_status" "subscription_status_enum" NOT NULL,
	"change_reason" varchar(100),
	"payment_method" varchar(50),
	"amount_cents" integer,
	"currency" varchar(3),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR',
	"billing_interval" "billing_interval_enum" NOT NULL,
	"trial_days" integer DEFAULT 0,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"stripe_price_id" varchar(255),
	"whop_product_id" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" varchar(50) NOT NULL,
	"consent_version" varchar(20) NOT NULL,
	"granted" boolean NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"method" varchar(50),
	"granted_at" timestamp,
	"revoked_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"avatar_url" text,
	"phone" varchar(20),
	"country_code" varchar(2),
	"timezone" varchar(50) DEFAULT 'UTC',
	"language" varchar(10) DEFAULT 'en',
	"subscription_tier" "subscription_tier_enum" DEFAULT 'free' NOT NULL,
	"subscription_status" "subscription_status_enum" DEFAULT 'active' NOT NULL,
	"subscription_start_date" timestamp,
	"subscription_end_date" timestamp,
	"trial_end_date" timestamp,
	"whop_order_id" varchar(255),
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"notification_settings" jsonb DEFAULT '{}'::jsonb,
	"email_verified" boolean DEFAULT false,
	"phone_verified" boolean DEFAULT false,
	"two_factor_enabled" boolean DEFAULT false,
	"last_login_at" timestamp,
	"login_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watchlist_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watchlist_id" integer NOT NULL,
	"date" date NOT NULL,
	"total_return_percent" numeric(10, 4),
	"day_change_percent" numeric(10, 4),
	"best_performer_symbol" varchar(10),
	"worst_performer_symbol" varchar(10),
	"avg_pe_ratio" numeric(10, 4),
	"avg_market_cap_millions" bigint,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_watchlist_date" UNIQUE("watchlist_id","date")
);
--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_performance" ADD CONSTRAINT "watchlist_performance_watchlist_id_enhanced_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."enhanced_watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_usage_user" ON "api_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_usage_endpoint" ON "api_usage_logs" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_usage_window" ON "api_usage_logs" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "idx_usage_created" ON "api_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_session" ON "audit_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_cache_key" ON "cache_entries" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "idx_cache_type" ON "cache_entries" USING btree ("cache_type");--> statement-breakpoint
CREATE INDEX "idx_cache_expires" ON "cache_entries" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_data_access_user" ON "data_access_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_data_access_type" ON "data_access_logs" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX "idx_data_access_created" ON "data_access_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_enhanced_stocks_symbol" ON "enhanced_stocks" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "idx_enhanced_stocks_sector" ON "enhanced_stocks" USING btree ("sector_id");--> statement-breakpoint
CREATE INDEX "idx_enhanced_stocks_exchange" ON "enhanced_stocks" USING btree ("exchange");--> statement-breakpoint
CREATE INDEX "idx_enhanced_stocks_market_cap_tier" ON "enhanced_stocks" USING btree ("market_cap_tier");--> statement-breakpoint
CREATE INDEX "idx_enhanced_watchlists_user" ON "enhanced_watchlists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_enhanced_watchlists_category" ON "enhanced_watchlists" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_holdings_portfolio" ON "portfolio_holdings" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "idx_holdings_symbol" ON "portfolio_holdings" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "idx_holdings_updated" ON "portfolio_holdings" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_portfolio" ON "portfolio_transactions" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_symbol" ON "portfolio_transactions" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "portfolio_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "portfolio_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "idx_portfolios_user" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_portfolios_updated" ON "portfolios" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_fundamentals_symbol" ON "stock_fundamentals" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "idx_fundamentals_year" ON "stock_fundamentals" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "idx_subscription_history_user" ON "subscription_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_history_created" ON "subscription_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_consent_user" ON "user_consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_consent_type" ON "user_consents" USING btree ("consent_type");--> statement-breakpoint
CREATE INDEX "idx_consent_granted" ON "user_consents" USING btree ("granted_at");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_subscription" ON "users" USING btree ("subscription_tier","subscription_status");--> statement-breakpoint
CREATE INDEX "idx_users_created_at" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_watchlist_perf_date" ON "watchlist_performance" USING btree ("date");