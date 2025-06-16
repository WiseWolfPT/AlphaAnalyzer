#!/usr/bin/env node

/**
 * FINAL DEPLOYMENT WORKFLOW
 * Complete deployment automation for Alpha Analyzer with 14 charts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

class DeploymentWorkflow {
    constructor() {
        this.colors = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            reset: '\x1b[0m'
        };
        this.originalDir = process.cwd();
        this.workspaceDir = path.join(this.originalDir, 'workspace');
        this.repoDir = path.join(this.workspaceDir, 'repo');
    }

    log(message, color = 'reset') {
        console.log(`${this.colors[color]}${message}${this.colors.reset}`);
    }

    fail(message) {
        console.log(`build FAIL - ${message}`);
        process.exit(1);
    }

    // Validate environment variables
    checkEnvironment() {
        const required = ['GIT_REPO', 'VERCEL_TOKEN', 'VERCEL_PROJECT_ID', 'VERCEL_ORG_ID'];
        const missing = required.filter(env => !process.env[env]);
        
        if (missing.length > 0) {
            this.fail(`Missing environment variables: ${missing.join(', ')}`);
        }
    }

    // Setup workspace and clone repository
    setupWorkspace() {
        this.log('Setting up workspace...', 'yellow');
        
        // Clean existing workspace
        if (fs.existsSync(this.workspaceDir)) {
            execSync(`rm -rf "${this.workspaceDir}"`, { stdio: 'pipe' });
        }
        
        fs.mkdirSync(this.workspaceDir, { recursive: true });
        
        // Clone repository
        try {
            execSync(`git clone "${process.env.GIT_REPO}" repo`, { 
                cwd: this.workspaceDir, 
                stdio: 'pipe' 
            });
            this.log('Repository cloned successfully', 'green');
        } catch (error) {
            this.fail('Failed to clone repository');
        }
    }

    // Create deployment branch
    createBranch() {
        this.log('Creating deployment branch...', 'yellow');
        
        try {
            process.chdir(this.repoDir);
            
            // Create or switch to branch
            try {
                execSync('git checkout -b ci/auto-deploy', { stdio: 'pipe' });
            } catch {
                execSync('git checkout ci/auto-deploy', { stdio: 'pipe' });
                execSync('git reset --hard origin/main', { stdio: 'pipe' });
            }
            
            this.log('Branch ci/auto-deploy ready', 'green');
        } catch (error) {
            this.fail('Failed to create deployment branch');
        }
    }

    // Apply deployment patches and validations
    applyPatches() {
        this.log('Applying deployment patches...', 'yellow');
        
        // Verify StockCharts.tsx exists and has 14 charts
        const stockChartsPath = 'client/src/pages/StockCharts.tsx';
        if (!fs.existsSync(stockChartsPath)) {
            this.fail('StockCharts.tsx not found');
        }
        
        const stockChartsContent = fs.readFileSync(stockChartsPath, 'utf8');
        const chartMatches = stockChartsContent.match(/<\w*Chart.*data=/g) || [];
        if (chartMatches.length < 14) {
            this.fail(`StockCharts.tsx missing charts (found: ${chartMatches.length}, expected: 14)`);
        }
        
        // Verify routing in App.tsx
        const appTsxPath = 'client/src/App.tsx';
        if (fs.existsSync(appTsxPath)) {
            const appContent = fs.readFileSync(appTsxPath, 'utf8');
            if (!appContent.includes('/stock/:symbol') || !appContent.includes('StockCharts')) {
                this.fail('Missing /stock/:symbol route or StockCharts component in App.tsx');
            }
        }
        
        // Create production environment file with VITE_ prefix
        const envContent = `VITE_API_URL=https://api.alphanalyzer.com
VITE_APP_NAME=Alpha Analyzer
VITE_APP_VERSION=1.0.0
VITE_ENABLE_CHARTS=true`;
        
        fs.writeFileSync('.env.production', envContent);
        
        // Verify all 14 chart components exist
        const requiredCharts = [
            'price-chart.tsx',
            'revenue-chart.tsx', 
            'revenue-segment-chart.tsx',
            'ebitda-chart.tsx',
            'free-cash-flow-chart.tsx',
            'net-income-chart.tsx',
            'eps-chart.tsx',
            'cash-debt-chart.tsx',
            'dividends-chart.tsx',
            'return-capital-chart.tsx',
            'shares-chart.tsx',
            'ratios-chart.tsx',
            'valuation-chart.tsx',
            'expenses-chart.tsx'
        ];
        
        const missingCharts = requiredCharts.filter(chart => 
            !fs.existsSync(`client/src/components/charts/${chart}`)
        );
        
        if (missingCharts.length > 0) {
            this.fail(`Missing chart components: ${missingCharts.join(', ')}`);
        }
        
        // Update package.json if needed to ensure proper build
        const packagePath = 'package.json';
        if (fs.existsSync(packagePath)) {
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            if (!packageJson.scripts.build || !packageJson.scripts.build.includes('vite build')) {
                packageJson.scripts.build = 'vite build';
                fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
            }
        }
        
        this.log('All patches applied and validations passed', 'green');
    }

    // Test build locally
    testBuild() {
        this.log('Testing build locally...', 'yellow');
        
        try {
            execSync('npm install', { stdio: 'pipe' });
            execSync('npm run build', { stdio: 'pipe' });
            
            if (!fs.existsSync('dist') || fs.readdirSync('dist').length === 0) {
                this.fail('Build output directory is empty');
            }
            
            this.log('Local build test successful', 'green');
        } catch (error) {
            this.fail('Build process failed');
        }
    }

    // Commit and push changes
    commitAndPush() {
        this.log('Committing and pushing changes...', 'yellow');
        
        try {
            execSync('git add .', { stdio: 'pipe' });
            
            // Check if there are changes to commit
            try {
                execSync('git diff --cached --quiet', { stdio: 'pipe' });
                this.log('No new changes to commit', 'yellow');
            } catch {
                // There are changes, commit them
                const commitMessage = `ci: automatic deployment patches for 14-chart stock analysis

- Ensure StockCharts.tsx implements all 14 financial charts
- Verify /stock/:symbol routing configuration  
- Configure VITE_ prefixed environment variables
- Validate all chart components are present
- Optimize build configuration for production

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>`;
                
                execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
                this.log('Changes committed', 'green');
            }
            
            execSync('git push -u origin ci/auto-deploy', { stdio: 'pipe' });
            this.log('Changes pushed to remote', 'green');
        } catch (error) {
            this.fail('Failed to commit and push changes');
        }
    }

    // HTTP request helper
    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({
                            statusCode: res.statusCode,
                            data: JSON.parse(data)
                        });
                    } catch {
                        resolve({
                            statusCode: res.statusCode,
                            data: data
                        });
                    }
                });
            });
            
            req.on('error', reject);
            
            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
        });
    }

    // Deploy to Vercel and monitor
    async deployToVercel() {
        this.log('Deploying to Vercel...', 'yellow');
        
        try {
            // Extract repository info
            const repoUrl = process.env.GIT_REPO;
            const repoMatch = repoUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
            if (!repoMatch) {
                this.fail('Invalid GitHub repository URL format');
            }
            
            const [, owner, repo] = repoMatch;
            
            // Create deployment
            const deploymentData = {
                name: 'alpha-analyzer',
                project: process.env.VERCEL_PROJECT_ID,
                target: 'production',
                gitSource: {
                    type: 'github',
                    ref: 'ci/auto-deploy',
                    repo: `${owner}/${repo}`
                },
                env: {
                    'VITE_API_URL': 'https://api.alphanalyzer.com',
                    'VITE_APP_NAME': 'Alpha Analyzer',
                    'VITE_APP_VERSION': '1.0.0',
                    'VITE_ENABLE_CHARTS': 'true'
                }
            };
            
            const response = await this.makeRequest('https://api.vercel.com/v13/deployments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deploymentData)
            });
            
            if (response.statusCode !== 200 && response.statusCode !== 201) {
                this.fail(`Deployment API call failed with status: ${response.statusCode}`);
            }
            
            const deploymentId = response.data.id || response.data.uid;
            if (!deploymentId) {
                this.fail('No deployment ID returned from Vercel');
            }
            
            this.log(`Deployment started: ${deploymentId}`, 'yellow');
            
            // Monitor deployment status
            const maxAttempts = 60; // 10 minutes
            let attempt = 0;
            let deploymentUrl = '';
            
            while (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
                attempt++;
                
                const statusResponse = await this.makeRequest(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`
                    }
                });
                
                const status = statusResponse.data.state || statusResponse.data.readyState;
                deploymentUrl = statusResponse.data.url;
                
                switch (status) {
                    case 'READY':
                        this.log('Deployment completed successfully!', 'green');
                        return deploymentUrl.startsWith('http') ? deploymentUrl : `https://${deploymentUrl}`;
                    
                    case 'ERROR':
                    case 'CANCELED':
                        this.fail(`Deployment failed with status: ${status}`);
                        break;
                    
                    default:
                        this.log(`Deployment status: ${status} (${attempt}/${maxAttempts})`, 'yellow');
                        break;
                }
            }
            
            this.fail('Deployment timeout - took longer than 10 minutes');
            
        } catch (error) {
            this.fail(`Deployment error: ${error.message}`);
        }
    }

    // Validate deployment
    async validateDeployment(url) {
        this.log('Validating deployment...', 'yellow');
        
        try {
            // Test main page
            const mainResponse = await this.makeRequest(url, { method: 'GET' });
            if (mainResponse.statusCode !== 200) {
                this.fail(`Main page validation failed with status: ${mainResponse.statusCode}`);
            }
            
            // Test stock charts page with AAPL
            const chartsUrl = `${url}/stock/AAPL`;
            const chartsResponse = await this.makeRequest(chartsUrl, { method: 'GET' });
            if (chartsResponse.statusCode !== 200) {
                this.fail(`Charts page validation failed with status: ${chartsResponse.statusCode}`);
            }
            
            this.log('Deployment validation successful - all pages accessible', 'green');
        } catch (error) {
            this.fail(`Validation error: ${error.message}`);
        }
    }

    // Main execution flow
    async run() {
        try {
            this.log('🚀 Starting Alpha Analyzer deployment workflow...', 'green');
            
            // Validate prerequisites
            this.checkEnvironment();
            
            // Setup workspace
            this.setupWorkspace();
            this.createBranch();
            
            // Apply patches and validate
            this.applyPatches();
            this.testBuild();
            
            // Deploy
            this.commitAndPush();
            const deploymentUrl = await this.deployToVercel();
            await this.validateDeployment(deploymentUrl);
            
            // Success!
            console.log(`✅ build OK → ${deploymentUrl}`);
            
        } catch (error) {
            console.log(`build FAIL - ${error.message}`);
            process.exit(1);
        } finally {
            // Cleanup - return to original directory
            process.chdir(this.originalDir);
        }
    }
}

// Execute if called directly
if (require.main === module) {
    const workflow = new DeploymentWorkflow();
    workflow.run();
}

module.exports = DeploymentWorkflow;