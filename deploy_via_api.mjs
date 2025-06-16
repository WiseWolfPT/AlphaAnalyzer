#!/usr/bin/env node

import fs from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const sleep = promisify(setTimeout);

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => stdout += data.toString());
    proc.stderr.on('data', (data) => stderr += data.toString());
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed: ${command} ${args.join(' ')}\nStderr: ${stderr}`));
      }
    });
  });
}

async function deployToVercel() {
  try {
    // Install dependencies
    console.error('Installing dependencies...');
    await runCommand('npm', ['install']);
    
    // Build project
    console.error('Building project...');
    await runCommand('npm', ['run', 'build']);
    
    // Create tarball (excluding node_modules)
    console.error('Creating deployment package...');
    await runCommand('tar', ['--exclude=./node_modules', '-czf', 'build.tgz', '.']);
    
    // Check for Vercel token
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      throw new Error('VERCEL_TOKEN environment variable is missing');
    }
    
    // Read the tarball
    const file = fs.readFileSync('build.tgz');
    
    // Deploy via Vercel API
    console.error('Deploying to Vercel...');
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/gzip'
      },
      body: file
    });
    
    const json = await response.json();
    
    if (!response.ok || !json.url) {
      throw new Error(`Deployment failed: ${JSON.stringify(json)}`);
    }
    
    const deploymentUrl = `https://${json.url}`;
    
    // Wait for deployment to be ready
    console.error('Waiting for deployment...');
    await sleep(10000);
    
    // Verify charts page
    const testResponse = await fetch(`${deploymentUrl}/stock/AAPL`);
    const html = await testResponse.text();
    
    if (!html.includes('id="price-chart"')) {
      throw new Error('Charts validation failed - price-chart not found');
    }
    
    // Success
    console.log(`✅ Deploy OK → ${deploymentUrl}`);
    
  } catch (error) {
    console.error(`❌ Deploy failed: ${error.message}`);
    process.exit(1);
  }
}

deployToVercel();