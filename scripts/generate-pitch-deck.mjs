#!/usr/bin/env node
/**
 * Generate investor pitch deck for XpressProFx
 * Creates a 10-slide PowerPoint presentation with:
 * - Professional design (dark navy with teal accents)
 * - Cover, problem, solution, product, market, business model, traction,
 *   technology, team, and ask
 * - Exports to /output/XpressProFx_PitchDeck.pptx
 */

import PptxGenJs from 'pptxgenjs';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '..', 'output');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
  console.log(`✓ Created output directory: ${outputDir}`);
}

// Create presentation
const prs = new PptxGenJs();

// Define colors and theme
const THEME = {
  darkBg: '0A1628',    // deep navy background
  accentTeal: '00C9B1', // teal accent
  white: 'FFFFFF',      // primary text
  gray: '8FA8C8',       // secondary text
};

// Set presentation properties
prs.defineLayout({ name: 'LAYOUT1', width: 33.87, height: 19.05 });
prs.defineLayout({ name: 'LAYOUT2', width: 33.87, height: 19.05 });

function createSlide(title = '') {
  const slide = prs.addSlide();
  
  // Dark background
  slide.background = { color: THEME.darkBg };
  
  // Footer on every slide
  const footer = slide.addText('XpressProFx.com | © 2026 (Formerly FxPro101.com)', {
    x: 0.5,
    y: 18.3,
    w: 32.87,
    h: 0.4,
    fontSize: 10,
    color: THEME.gray,
    align: 'center',
    fontFace: 'Calibri'
  });
  
  // Slide number
  const slideNum = slide.addText(`${prs.slides.length}`, {
    x: 31.87,
    y: 18.3,
    w: 1,
    h: 0.4,
    fontSize: 10,
    color: THEME.gray,
    align: 'right',
    fontFace: 'Calibri'
  });
  
  return slide;
}

function addTitle(slide, title) {
  slide.addText(title, {
    x: 0.5,
    y: 1,
    w: 32.87,
    h: 0.8,
    fontSize: 44,
    bold: true,
    color: THEME.accentTeal,
    fontFace: 'Calibri'
  });
  
  // Horizontal rule
  slide.addShape(prs.ShapeType.rect, {
    x: 0.5,
    y: 2.1,
    w: 32.87,
    h: 0.05,
    fill: { color: THEME.accentTeal },
    line: { type: 'none' }
  });
}

function addBullet(slide, text, y, indent = 0) {
  slide.addText(text, {
    x: 1 + indent * 0.3,
    y: y,
    w: 31.37 - indent * 0.3,
    h: 0.5,
    fontSize: 18,
    color: THEME.white,
    fontFace: 'Calibri',
    valign: 'top'
  });
}

// SLIDE 1: COVER
console.log('Creating slide 1: Cover...');
const slide1 = createSlide();
slide1.addText('XpressProFx.com', {
  x: 0.5,
  y: 7,
  w: 32.87,
  h: 1.5,
  fontSize: 66,
  bold: true,
  color: THEME.accentTeal,
  align: 'center',
  fontFace: 'Calibri'
});
slide1.addText('Hybrid Forex Broker & Investment Trading Platform', {
  x: 0.5,
  y: 8.8,
  w: 32.87,
  h: 0.8,
  fontSize: 32,
  color: THEME.white,
  align: 'center',
  fontFace: 'Calibri'
});
slide1.addText('Institutional-grade trading. Built for everyone.', {
  x: 0.5,
  y: 10,
  w: 32.87,
  h: 0.6,
  fontSize: 24,
  color: THEME.gray,
  align: 'center',
  fontFace: 'Calibri'
});

// SLIDE 2: THE PROBLEM
console.log('Creating slide 2: The Problem...');
const slide2 = createSlide();
addTitle(slide2, 'The Problem');
addBullet(slide2, 'Retail traders locked out of institutional tools', 2.5);
addBullet(slide2, 'Wide spreads, opaque execution, poor transparency', 3.2);
addBullet(slide2, 'No copy trading or managed account features', 3.9);
addBullet(slide2, 'Fragmented crypto + forex experience', 4.6);
addBullet(slide2, 'Poor mobile UX for active traders', 5.3);
addBullet(slide2, 'Limited P2P trading infrastructure', 6);

// SLIDE 3: OUR SOLUTION
console.log('Creating slide 3: Our Solution...');
const slide3 = createSlide();
addTitle(slide3, 'Our Solution');
slide3.addText('One unified platform for Forex, Crypto, P2P Trading, Copy Trading, and Managed Investment Accounts.', {
  x: 0.5,
  y: 2.8,
  w: 32.87,
  h: 1,
  fontSize: 22,
  color: THEME.white,
  fontFace: 'Calibri'
});
slide3.addText('Everything a pro trader needs. Nothing they don\'t.', {
  x: 0.5,
  y: 4.1,
  w: 32.87,
  h: 0.8,
  fontSize: 28,
  color: THEME.accentTeal,
  bold: true,
  fontFace: 'Calibri'
});
addBullet(slide3, 'Real-time execution with competitive spreads', 5.3);
addBullet(slide3, 'Zero platform friction for traders', 6);

// SLIDE 4: PRODUCT OVERVIEW
console.log('Creating slide 4: Product Overview...');
const slide4 = createSlide();
addTitle(slide4, 'Product Overview');
addBullet(slide4, 'Live & demo trading accounts', 2.5);
addBullet(slide4, 'Real-time forex + crypto execution', 3.1);
addBullet(slide4, 'P2P order matching engine', 3.7);
addBullet(slide4, 'Copy trading (mirror top performers)', 4.3);
addBullet(slide4, 'Admin backend with full user management', 4.9);
addBullet(slide4, 'Built-in KYC & compliance workflows', 5.5);
addBullet(slide4, 'AI-powered trading assistant', 6.1);
addBullet(slide4, 'Multi-currency wallet management', 6.7);

// SLIDE 5: MARKET OPPORTUNITY
console.log('Creating slide 5: Market Opportunity...');
const slide5 = createSlide();
addTitle(slide5, 'Market Opportunity');
addBullet(slide5, 'Global retail forex market: $7.5 trillion daily volume', 2.5);
addBullet(slide5, 'Retail participation growing 15% YoY', 3.2);
addBullet(slide5, 'Target: self-directed traders aged 25-45', 3.9);
addBullet(slide5, 'Addressable market: $12B+ in broker revenue globally', 4.6);
slide5.addText('XpressProFx targets the fastest-growing segment of retail traders seeking professional-grade tools.', {
  x: 1,
  y: 5.8,
  w: 31.87,
  h: 1,
  fontSize: 20,
  color: THEME.gray,
  italic: true,
  fontFace: 'Calibri'
});

// SLIDE 6: BUSINESS MODEL
console.log('Creating slide 6: Business Model...');
const slide6 = createSlide();
addTitle(slide6, 'Business Model');
addBullet(slide6, 'Bid/ask spread on all traded instruments', 2.5);
addBullet(slide6, 'Withdrawal and transfer fees', 3.1);
addBullet(slide6, 'Managed account performance commissions (20% profit share)', 3.7);
addBullet(slide6, 'Premium account tier subscriptions', 4.3);
addBullet(slide6, 'P2P matching fee (0.1% per matched order)', 4.9);
slide6.addText('Diversified revenue streams ensure stability and growth potential.', {
  x: 1,
  y: 6.3,
  w: 31.87,
  h: 1,
  fontSize: 20,
  color: THEME.gray,
  italic: true,
  fontFace: 'Calibri'
});

// SLIDE 7: TRACTION & ROADMAP
console.log('Creating slide 7: Traction & Roadmap...');
const slide7 = createSlide();
addTitle(slide7, 'Traction & Roadmap');
addBullet(slide7, 'Current: Platform built, auth live, admin backend operational', 2.5);
addBullet(slide7, 'Q3 2026: Go-live, first 1,000 registered users', 3.2);
addBullet(slide7, 'Q4 2026: Copy trading + managed accounts launch', 3.9);
addBullet(slide7, 'Q1 2027: Mobile app (iOS + Android)', 4.6);
addBullet(slide7, 'Q2 2027: Series A fundraise', 5.3);

// SLIDE 8: TECHNOLOGY
console.log('Creating slide 8: Technology...');
const slide8 = createSlide();
addTitle(slide8, 'Technology');
addBullet(slide8, 'Frontend: React + Vite + Tailwind CSS + shadcn/ui', 2.5);
addBullet(slide8, 'Backend: Node.js + Express', 3.1);
addBullet(slide8, 'Database: PostgreSQL + Drizzle ORM', 3.7);
addBullet(slide8, 'Monorepo: npm workspaces', 4.3);
addBullet(slide8, 'Infrastructure: VPS with Nginx + PM2, SSL/TLS', 4.9);
addBullet(slide8, 'Security: Rate limiting, helmet, encrypted sessions, KYC', 5.5);
slide8.addText('Enterprise-grade tech stack designed for scale and security.', {
  x: 1,
  y: 6.5,
  w: 31.87,
  h: 1,
  fontSize: 20,
  color: THEME.gray,
  italic: true,
  fontFace: 'Calibri'
});

// SLIDE 9: TEAM
console.log('Creating slide 9: Team...');
const slide9 = createSlide();
addTitle(slide9, 'Team');
addBullet(slide9, 'Founder / CEO — Vision, product strategy, fintech domain', 2.5);
addBullet(slide9, 'CTO / Lead Engineer — Full-stack, infrastructure, security', 3.2);
addBullet(slide9, 'Head of Compliance — KYC/AML, regulatory relationships', 3.9);
addBullet(slide9, 'Head of Growth — Trader acquisition, partnerships', 4.6);
slide9.addText('Expert team with proven experience in fintech, trading platforms, and compliance.', {
  x: 1,
  y: 5.8,
  w: 31.87,
  h: 1,
  fontSize: 20,
  color: THEME.gray,
  italic: true,
  fontFace: 'Calibri'
});

// SLIDE 10: THE ASK
console.log('Creating slide 10: The Ask...');
const slide10 = createSlide();
addTitle(slide10, 'The Ask');
slide10.addText('Raising: Seed Round (Amount TBD)', {
  x: 0.5,
  y: 2.8,
  w: 32.87,
  h: 0.6,
  fontSize: 22,
  bold: true,
  color: THEME.accentTeal,
  fontFace: 'Calibri'
});
addBullet(slide10, '40% — Engineering & product (mobile app, copy trading)', 3.7);
addBullet(slide10, '30% — Regulatory licensing & compliance', 4.4);
addBullet(slide10, '20% — Marketing & trader acquisition', 5.1);
addBullet(slide10, '10% — Operations & infrastructure', 5.8);
slide10.addText('Contact: support@xpressprofx.com', {
  x: 0.5,
  y: 7.2,
  w: 32.87,
  h: 0.4,
  fontSize: 18,
  color: THEME.white,
  fontFace: 'Calibri'
});
slide10.addText('Website: XpressProFx.com', {
  x: 0.5,
  y: 7.7,
  w: 32.87,
  h: 0.4,
  fontSize: 18,
  color: THEME.white,
  fontFace: 'Calibri'
});

// Save presentation
const outputPath = path.join(outputDir, 'XpressProFx_PitchDeck.pptx');
prs.writeFile({ fileName: outputPath });
console.log(`✓ Investor pitch deck created: ${outputPath}`);
console.log(`✓ 10 slides generated with professional design`);
