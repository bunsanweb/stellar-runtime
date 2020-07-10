import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });
  browser.on("targetdestroyed", () => {
    console.log("targetdestroyed");
    
  });
  const page = await browser.newPage();
  await page.goto("http://example.com/");
  
})().catch(console.error);
