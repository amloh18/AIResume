# CVCircle Chrome Extension Testing Guide

## 🚀 Quick Start Testing

### 1. Load the Extension

1. **Open Chrome Extensions**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

2. **Load the Extension**:
   - Click "Load unpacked"
   - Select the `chrome-extension` folder
   - The extension should appear in your extensions list

3. **Pin the Extension**:
   - Click the puzzle piece icon in Chrome toolbar
   - Pin "CVCircle Job Saver" for easy access

### 2. Generate Icons

1. **Open Icon Generator**:
   - Open `chrome-extension/generate-icons.html` in Chrome
   - Click "Generate Icons"
   - Download all 4 icon sizes (16x16, 32x32, 48x48, 128x128)
   - Save them in the `chrome-extension/icons/` folder

### 3. Configure for Local Testing

1. **Update API URL**:
   - Open `chrome-extension/background.js`
   - Change line 3: `const API_BASE_URL = 'http://localhost:3000';`
   - Save the file

2. **Start Your CVCircle App**:
   ```bash
   cd /Users/amlohsl/Documents/VScode_projects/PROJECTS/Circle_CV_app
   npm run dev
   ```

3. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Click the refresh icon on CVCircle extension

## 🧪 Testing Scenarios

### Test 1: Authentication Flow

1. **Open Extension Popup**:
   - Click the CVCircle extension icon
   - Should show "Not authenticated" status

2. **Login**:
   - Click "Login to CVCircle"
   - Should open new tab with login page
   - Complete login process
   - Return to extension popup
   - Should show "Connected as [your-email]"

3. **Verify Authentication**:
   - Extension should remember login
   - Popup should show user info

### Test 2: Job Site Detection

1. **Visit LinkedIn**:
   - Go to `https://www.linkedin.com/jobs/`
   - Search for a job
   - Open a job posting
   - Look for "Save to CVCircle" button

2. **Visit Indeed**:
   - Go to `https://www.indeed.com/`
   - Search for a job
   - Open a job posting
   - Look for "Save to CVCircle" button

3. **Visit Glassdoor**:
   - Go to `https://www.glassdoor.com/Job/`
   - Search for a job
   - Open a job posting
   - Look for "Save to CVCircle" button

### Test 3: Job Saving

1. **Save Job from Button**:
   - On any job posting page
   - Click "Save to CVCircle" button
   - Should show "Saving..." then "Saved!"
   - Check your CVCircle dashboard for the saved job

2. **Save Job from Popup**:
   - Click extension icon
   - Should show current job details
   - Click "Save Job" button
   - Should show success message

### Test 4: Error Handling

1. **Test Without Authentication**:
   - Logout from extension
   - Try to save a job
   - Should show "Please login first"

2. **Test Network Error**:
   - Stop your local server
   - Try to save a job
   - Should show "Network error"

3. **Test Invalid Job Data**:
   - Visit a non-job page
   - Try to save
   - Should show "No job data to save"

## 🔧 Debugging

### Check Extension Logs

1. **Background Script Logs**:
   - Go to `chrome://extensions/`
   - Click "Details" on CVCircle extension
   - Click "Inspect views: background page"
   - Check Console for logs

2. **Content Script Logs**:
   - Open any job site
   - Press F12 to open DevTools
   - Check Console for extension logs

3. **Popup Logs**:
   - Right-click extension icon
   - Select "Inspect popup"
   - Check Console for logs

### Check Storage

1. **View Extension Storage**:
   - Go to `chrome://extensions/`
   - Click "Details" on CVCircle extension
   - Click "Extension options"
   - Check stored data

2. **Clear Storage**:
   - In extension options
   - Click "Clear storage"
   - Reload extension

### Check Network Requests

1. **API Calls**:
   - Open DevTools
   - Go to Network tab
   - Try to save a job
   - Check for API requests to your CVCircle server

## 🐛 Common Issues

### Issue 1: Extension Not Loading

**Symptoms**: Extension doesn't appear in extensions list

**Solutions**:
   - Check that all files are in the `chrome-extension` folder
   - Verify `manifest.json` is valid JSON
   - Check Chrome console for CVCircle extension errors

### Issue 2: Icons Not Showing

**Symptoms**: Extension shows default icon

**Solutions**:
- Generate icons using `generate-icons.html`
- Save icons in `chrome-extension/icons/` folder
- Reload extension

### Issue 3: Authentication Not Working

**Symptoms**: Can't login or stay logged in

**Solutions**:
- Check API URL in `background.js`
   - Verify your CVCircle app is running
- Check network connectivity
- Clear extension storage and retry

### Issue 4: Job Data Not Extracting

**Symptoms**: No job details in popup

**Solutions**:
- Check if you're on a supported job site
- Verify job selectors in `content.js`
- Check content script logs in DevTools

### Issue 5: Jobs Not Saving

**Symptoms**: Save button doesn't work

**Solutions**:
- Check authentication status
- Verify API endpoint is working
- Check network requests in DevTools
- Verify job data is being extracted

## 📊 Testing Checklist

### Pre-Testing Setup
- [ ] Extension loads without errors
- [ ] Icons are generated and saved
- [ ] API URL is configured correctly
- [ ] Circle CV app is running locally

### Authentication Testing
- [ ] Extension shows "Not authenticated" initially
- [ ] Login button opens correct page
- [ ] Authentication persists after login
- [ ] Logout works correctly

### Job Site Testing
- [ ] LinkedIn job detection works
- [ ] Indeed job detection works
- [ ] Glassdoor job detection works
- [ ] Other supported sites work

### Job Saving Testing
- [ ] Save button appears on job pages
- [ ] Job data is extracted correctly
- [ ] Save operation completes successfully
- [ ] Jobs appear in CVCircle dashboard

### Error Handling Testing
- [ ] Network errors are handled gracefully
- [ ] Authentication errors are handled
- [ ] Invalid job data is handled
- [ ] User feedback is provided

### UI/UX Testing
- [ ] Popup interface works correctly
- [ ] Button states update properly
- [ ] Loading states are shown
- [ ] Success/error messages are clear

## 🚀 Production Testing

### Before Publishing

1. **Test on Production API**:
   - Change API URL to production
   - Test all functionality
   - Verify authentication works

2. **Test on Different Sites**:
   - Test on all supported job sites
   - Verify job extraction works
   - Check for any site-specific issues

3. **Performance Testing**:
   - Test with multiple tabs open
   - Check memory usage
   - Verify extension doesn't slow down browser

4. **Security Testing**:
   - Verify no sensitive data is logged
   - Check API communication is secure
   - Verify permissions are minimal

### Chrome Web Store Submission

1. **Prepare Extension**:
   - Zip the `chrome-extension` folder
   - Include all required files
   - Test the zip file

2. **Submit for Review**:
   - Go to Chrome Web Store Developer Dashboard
   - Upload extension zip
   - Fill out store listing details
   - Submit for review

3. **Monitor Review**:
   - Check review status regularly
   - Address any feedback
   - Resubmit if needed

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________
Environment: Local/Production
Chrome Version: ___________

Authentication:
- [ ] Login works
- [ ] Logout works
- [ ] Session persists

Job Sites:
- [ ] LinkedIn
- [ ] Indeed
- [ ] Glassdoor
- [ ] Other sites

Job Saving:
- [ ] Button appears
- [ ] Data extraction works
- [ ] Save operation works
- [ ] Jobs appear in dashboard

Error Handling:
- [ ] Network errors
- [ ] Auth errors
- [ ] Invalid data

UI/UX:
- [ ] Popup interface
- [ ] Button states
- [ ] Loading states
- [ ] Messages

Issues Found:
1. ___________
2. ___________
3. ___________

Overall Status: Pass/Fail
Notes: ___________
```
