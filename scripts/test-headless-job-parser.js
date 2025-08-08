const puppeteer = require('puppeteer');

async function testHeadlessJobParser() {
  console.log('🧪 Testing Headless Browser Job Parser...\n');

  let browser = null;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });

    // Test with a simple HTML page
    const testHtml = `
      <html>
        <head><title>Test Job</title></head>
        <body>
          <h1 class="job-title">Senior Software Engineer</h1>
          <div class="company-name">TechCorp Inc.</div>
          <div class="location">San Francisco, CA</div>
          <div class="salary">$120,000 - $180,000 a year</div>
          <div class="job-description">
            We are looking for a Senior Software Engineer to join our growing team. 
            You will be responsible for developing and maintaining web applications, 
            working with modern technologies like React, Node.js, and MongoDB.
          </div>
          <div class="requirements">
            <h3>Requirements:</h3>
            <ul>
              <li>5+ years of experience in software development</li>
              <li>Strong knowledge of React, Node.js, and MongoDB</li>
              <li>Experience with cloud platforms (AWS, Azure, or GCP)</li>
            </ul>
          </div>
          <div class="skills">
            <h3>Skills:</h3>
            <span>React</span>
            <span>Node.js</span>
            <span>MongoDB</span>
            <span>JavaScript</span>
          </div>
        </body>
      </html>
    `;

    console.log('🔗 Testing with mock HTML page...');
    
    // Set the HTML content
    await page.setContent(testHtml);
    
    // Extract job details
    const jobDetails = await page.evaluate(() => {
      const title = document.querySelector('h1.job-title')?.textContent?.trim() || 
                   document.querySelector('h1')?.textContent?.trim() || 
                   'Job Title Not Found';
      
      const company = document.querySelector('.company-name')?.textContent?.trim() || 
                     document.querySelector('[class*="company"]')?.textContent?.trim() || 
                     'Company Not Found';
      
      const location = document.querySelector('.location')?.textContent?.trim() || null;
      
      const salaryText = document.querySelector('.salary')?.textContent?.trim() || null;
      
      const description = document.querySelector('.job-description')?.textContent?.trim() || 
                         document.querySelector('.description')?.textContent?.trim() || 
                         'Description not available';
      
      // Parse salary
      let salary = null;
      if (salaryText) {
        const match = salaryText.match(/\$([\d,]+)\s*-\s*\$([\d,]+)\s*(a year|per year|annually)/i);
        if (match) {
          salary = {
            min: parseInt(match[1].replace(/,/g, '')),
            max: parseInt(match[2].replace(/,/g, '')),
            currency: 'USD',
            period: 'year'
          };
        }
      }
      
      // Extract requirements
      const requirements = Array.from(document.querySelectorAll('.requirements li'))
        .map(li => li.textContent?.trim())
        .filter(text => text && text.length > 0);
      
      // Extract skills
      const skills = Array.from(document.querySelectorAll('.skills span'))
        .map(span => span.textContent?.trim())
        .filter(text => text && text.length > 0);
      
      return {
        title,
        company,
        location,
        salary,
        description,
        requirements,
        skills,
        sourceUrl: 'https://test.job.com'
      };
    });
    
    console.log(`✅ Success! Parsed job details:`);
    console.log(`📋 Job Title: ${jobDetails.title}`);
    console.log(`🏢 Company: ${jobDetails.company}`);
    console.log(`📍 Location: ${jobDetails.location || 'Not specified'}`);
    console.log(`💰 Salary: ${jobDetails.salary ? `${jobDetails.salary.min}-${jobDetails.salary.max} ${jobDetails.salary.currency}/${jobDetails.salary.period}` : 'Not specified'}`);
    console.log(`📝 Description length: ${jobDetails.description.length} characters`);
    console.log(`🎯 Skills: ${jobDetails.skills?.length || 0} skills found`);
    console.log(`📋 Requirements: ${jobDetails.requirements?.length || 0} requirements found`);
    console.log('---\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🧹 Browser closed');
    }
  }
}

// Run the test
testHeadlessJobParser().catch(console.error); 