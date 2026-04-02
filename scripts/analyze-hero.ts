import { chromium } from '@playwright/test';

async function analyzeHero() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('https://www.portfoliobyshruti.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  
  // 分析Hero区域的详细内容
  const heroContent = await page.evaluate(() => {
    // 获取Hero区域内的所有元素
    const hero = document.querySelector('section:first-of-type, [class*="hero"], main > div:first-of-type');
    
    if (!hero) return { error: 'No hero found' };
    
    // 获取所有文本内容
    const texts = Array.from(hero.querySelectorAll('h1, h2, h3, p, span, a')).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim().slice(0, 100),
      className: (el as HTMLElement).className,
      style: {
        fontSize: window.getComputedStyle(el).fontSize,
        color: window.getComputedStyle(el).color,
        fontFamily: window.getComputedStyle(el).fontFamily,
      }
    }));
    
    // 获取Hero区域的整体样式
    const heroStyle = {
      height: window.getComputedStyle(hero).height,
      padding: window.getComputedStyle(hero).padding,
      backgroundColor: window.getComputedStyle(hero).backgroundColor,
      display: window.getComputedStyle(hero).display,
      flexDirection: window.getComputedStyle(hero).flexDirection,
      justifyContent: window.getComputedStyle(hero).justifyContent,
      alignItems: window.getComputedStyle(hero).alignItems,
    };
    
    // 获取所有子元素的结构
    const structure = Array.from(hero.children).map((child, i) => ({
      index: i,
      tag: child.tagName,
      className: (child as HTMLElement).className,
      childCount: child.children.length,
      text: child.textContent?.trim().slice(0, 50),
    }));
    
    return {
      heroStyle,
      structure,
      texts: texts.slice(0, 15),
    };
  });
  
  console.log(JSON.stringify(heroContent, null, 2));
  
  // 截图Hero区域
  const hero = await page.$('section:first-of-type, [class*="hero"], main > div:first-of-type');
  if (hero) {
    await hero.screenshot({ path: 'docs/shruti-hero.png' });
  }
  
  await browser.close();
}

analyzeHero().catch(console.error);
