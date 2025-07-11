#!/usr/bin/env node

/**
 * AUTO-DEPLOY SETUP
 * Creates automatic deployment pipeline: Code Changes → GitHub → Vercel → Live Site
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutoDeploySetup {
    constructor() {
        this.projectDir = process.cwd();
        this.repoName = 'alpha-analyzer-webapp';
    }

    log(message, color = 'white') {
        const colors = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            white: '\x1b[37m',
            reset: '\x1b[0m'
        };
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    async setupGitRepository() {
        this.log('🔧 Setting up Git repository...', 'yellow');
        
        try {
            // Initialize git if not already
            if (!fs.existsSync('.git')) {
                execSync('git init', { stdio: 'pipe' });
                this.log('✓ Git repository initialized', 'green');
            }

            // Create .gitignore
            const gitignoreContent = `# Dependencies
node_modules/
.pnpm-debug.log*

# Production builds
dist/
build/

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Database
*.db
*.sqlite

# Temporary files
*.tmp
*.temp
workspace/`;

            fs.writeFileSync('.gitignore', gitignoreContent);
            
            // Create README with live demo link
            const readmeContent = `# Alpha Analyzer - Stock Analysis Webapp

🚀 **Live Demo**: Will be available after setup

## Features
- Portuguese landing page with modern design
- Real-time stock dashboard
- 14 comprehensive financial charts
- Intrinsic value calculations
- Responsive design with dark theme

## Auto-Deployment
This project uses automatic deployment:
- Every code change → GitHub → Vercel → Live update
- URL will be provided after first deployment

## Tech Stack
- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS
- Charts: Chart.js + React Chart.js 2
- Routing: Wouter
- APIs: Finnhub + Alpha Vantage

## Development
\`\`\`bash
npm install
npm run dev
\`\`\`

🤖 Auto-deployed with Claude Code`;

            fs.writeFileSync('README.md', readmeContent);

            this.log('✓ Git configuration files created', 'green');
            return true;
        } catch (error) {
            this.log(`✗ Git setup failed: ${error.message}`, 'red');
            return false;
        }
    }

    setupVercelConfig() {
        this.log('⚙️ Configuring Vercel deployment...', 'yellow');
        
        // Optimize vercel.json for automatic builds
        const vercelConfig = {
            "version": 2,
            "framework": "vite",
            "buildCommand": "npm run build",
            "outputDirectory": "dist/public",
            "installCommand": "npm install",
            "env": {
                "NODE_ENV": "production"
            },
            "routes": [
                {
                    "src": "/assets/(.*)",
                    "dest": "/assets/$1"
                },
                {
                    "src": "/(.*)",
                    "dest": "/index.html"
                }
            ]
        };

        fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
        this.log('✓ Vercel configuration optimized', 'green');
    }

    createDeployScript() {
        this.log('📜 Creating deployment scripts...', 'yellow');

        // Auto-commit and deploy script
        const deployScript = `#!/bin/bash

# Auto-deploy script - commits changes and triggers deployment
echo "🚀 Auto-deploying changes..."

# Add all changes
git add .

# Commit with timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
git commit -m "auto-deploy: webapp updates $TIMESTAMP

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to trigger auto-deployment
git push origin main

echo "✅ Changes pushed - Vercel will auto-deploy"
echo "🌐 Check your Vercel dashboard for deployment status"`;

        fs.writeFileSync('auto-deploy.sh', deployScript);
        execSync('chmod +x auto-deploy.sh', { stdio: 'pipe' });

        // Watch script for development
        const watchScript = `#!/bin/bash

# Development watch script
echo "👀 Starting development with auto-reload..."
echo "🌐 Local: http://localhost:5173"
echo "📝 Make changes and they'll appear instantly"
echo ""

npm run dev`;

        fs.writeFileSync('dev-watch.sh', watchScript);
        execSync('chmod +x dev-watch.sh', { stdio: 'pipe' });

        this.log('✓ Deployment scripts created', 'green');
    }

    generateInstructions() {
        const instructions = `
🎯 AUTO-DEPLOYMENT SETUP COMPLETE!

📋 NEXT STEPS:

1. CREATE GITHUB REPOSITORY:
   • Go to https://github.com/new
   • Repository name: ${this.repoName}
   • Make it public
   • Don't initialize with README (we have one)

2. CONNECT TO GITHUB:
   git remote add origin https://github.com/YOUR_USERNAME/${this.repoName}.git
   git branch -M main
   git push -u origin main

3. SETUP VERCEL AUTO-DEPLOY:
   • Go to https://vercel.com
   • Click "New Project"
   • Import from GitHub: ${this.repoName}
   • Deploy!

4. AFTER SETUP - USAGE:
   
   🔄 TO DEPLOY CHANGES:
   ./auto-deploy.sh
   
   🚀 FOR DEVELOPMENT:
   ./dev-watch.sh
   
   📱 LIVE WEBAPP:
   Your Vercel URL (e.g., https://${this.repoName}.vercel.app)

🎉 BENEFITS:
✓ Every change automatically updates the live site
✓ Fixed URL that always shows latest version
✓ No manual deployment needed
✓ Full webapp functionality + 14 charts
✓ Works on mobile and desktop

💡 TIP: After connecting to Vercel, any push to GitHub
will automatically trigger a new deployment!
`;

        fs.writeFileSync('DEPLOYMENT_INSTRUCTIONS.md', instructions);
        this.log(instructions, 'blue');
    }

    async run() {
        this.log('🚀 Setting up Auto-Deploy Pipeline...', 'green');
        this.log('', 'white');

        const success = await this.setupGitRepository();
        if (!success) return;

        this.setupVercelConfig();
        this.createDeployScript();
        this.generateInstructions();

        this.log('', 'white');
        this.log('✅ AUTO-DEPLOY SETUP COMPLETE!', 'green');
        this.log('📖 Check DEPLOYMENT_INSTRUCTIONS.md for next steps', 'yellow');
    }
}

if (require.main === module) {
    const setup = new AutoDeploySetup();
    setup.run();
}

module.exports = AutoDeploySetup;