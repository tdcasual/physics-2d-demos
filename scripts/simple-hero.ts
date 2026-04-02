import { chromium } from '@playwright/test';

async function simpleHero() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://www.portfoliobyshruti.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // 简单的文本提取
  const content = await page.evaluate(() => {
    // 获取页面主要文本
    const mainContent = document.body.innerText.split('\n').filter(t => t.trim()).slice(0, 30);
    
    // 获取h1和h2
    const headings = Array.from(document.querySelectorAll('h1, h2')).map(h => ({
      tag: h.tagName,
      text: h.textContent?.trim()
    }));
    
    return { mainContent, headings };
  });
  
  console.log('=== Headings ===');
  content.headings.forEach(h => console.log(`${h.tag}: ${h.text}`));
  
  console.log('\n=== Main Content (first 20 lines) ===');
  content.mainContent.slice(0, 20).forEach((line, i) => console.log(`${i + 1}. ${line}`));
  
  await browser.close();
}

simpleHero().catch(e => console.log(e.message));
