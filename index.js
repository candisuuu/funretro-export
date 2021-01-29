const fs = require('fs'); // use fs for formatting plaintext files
const csv = require('fast-csv'); // use fast-csv for formatting csv files
const path = require('path');
const { chromium } = require('playwright');

// define url and extension variables
const [url, extension] = process.argv.slice(2);

// check if the user had entered a valid url
const urlRegex = new RegExp(/^(https?|ftp|file):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/, 'i');
const urlTest = url ? urlRegex.exec(url) : null;

if (!urlTest)
  throw 'Please provide a valid URL as the first argument.';

// check for and make sure to limit the user to plaintext or CSV extensions
const extRegex = new RegExp(/^(txt|csv)$/, 'i');
const extTest = extension ? extRegex.exec(extension) : null;

if (!extTest)
  throw 'Please provide a filetype you want to use (CSV or TXT) as the second argument.'

/**
 * Run data scrape and return parsedData object with data configured
 * based on fileType value (csv or txt)
 * @param {string} fileType 
 */
async function run(fileType) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const parsedData = { };

  // fetch page data
  await page.goto(url);
  await page.waitForSelector('.message-list');

  // get board title
  const boardTitle = await page.$eval('.board-name', (node) => node.innerText.trim());

  // add boardTitle value to parsedData object if it exists, if not throw an error
  if (!boardTitle)
    throw 'Board title does not exist. Please check if provided URL is correct.'
  else
    parsedData.title = boardTitle;

  // prepare columns for parsing
  const columns = await page.$$('.message-list');

  /** 
   * CONFIGURE DATA FOR CSV
   * Expected output example:
   * {
   *    title: "My Board Contents",
   *    data: [
   *      ["col1", "col2", "col3"],
   *      ["row1-col1", "row1-col2", "row1-col3"],
   *      ["row2-col1", "row2-col2", "row2-col3"]
   *    ]
   * }
   */
  if (/csv/i.test(fileType)) {
    // add empty data array to parsedData object
    parsedData.data = [];

    // start looping through each column
    for (let i = 0; i < columns.length; i++) {
      // get column title
      const columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());

      // add column titles to first child array
      if (i === 0)
        parsedData.data[0] = [columnTitle]; // initiate array with first item
      else
        parsedData.data[0].push(columnTitle); // push additional items to the first array

      // get column messages
      const messages = await columns[i].$$('.message-main');

      // loop through and add messages to child arrays
      // NOTE: do not add vote count - this way each idea on the board can be considered without any existing weight in a retrospective
      for (let j = 0; j < messages.length; j++) {
        let messageText = await messages[j].$eval('.message-body .text', (node) => node.innerText.trim());
        const votes = await messages[j].$eval('.votes .vote-area span.show-vote-count', (node) => parseInt(node.innerText.trim()));

        // only add a new row/message if the message we're looking at has more than 0 votes
        if (votes > 0) {
        // check if an array (row) already exists
          if (parsedData.data[(j+1)]) {
            // add message to its respective position in the array based on column (i)
              parsedData.data[(j+1)][i] = messageText;
          } else { // if an array does not exist then check if the message has more than 0 votes and create a new array
            // create new array variable
            let newArray = new Array(columns.length).fill('', 0, columns.length);

            // then add content to its respective slot in the array
            newArray[i] = messageText;

            // finally push it into the parsedData.data array
            parsedData.data.push(newArray);
          }
        }
      }
    }
  }

  /**
   * CONFIGURE DATA FOR PLAINTEXT
   * Expected output example:
   * {
   *    title: "My Board Contents",
   *    data: "My Board Contents\n\nCol 1 Title\n- Row 1-Col 1 Content (Vote Count)\n
   *          - Row 2-Col 1 Content (Vote Count)\n\nCol 2 Title\n- Row 1-Col 2 Content (Vote Count)\n
   *          - Row 2-Col 2 Content (Vote Count)"
   * }
   */
  else if (/txt/i.test(fileType)) {
    // start new parsedData.data string with boardTitle
    parsedData.data = boardTitle + '\n\n';

    // start looping through each column
    for (let i = 0; i < columns.length; i++) {
      // get column title
      const columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());

      // get column messages
      const messages = await columns[i].$$('.message-main');

      // if there are messages in the column then add the column title to parsedData.data string
      if (messages.length)
        parsedData.data += columnTitle + '\n';

      // loop through and add messages from the column to the parsedData.data string after the column title
      for (let i = 0; i < messages.length; i++) {
        const messageText = await messages[i].$eval('.message-body .text', (node) => node.innerText.trim());
        const votes = await messages[i].$eval('.votes .vote-area span.show-vote-count', (node) => node.innerText.trim());
        parsedData.data += `- ${messageText} (${votes})` + '\n';
      }

      // then add a new line in the string after the final message if messages are present in the column
      if (messages.length)
        parsedData.data += '\n';
    }
  }

  // return parsedData object to be written to a file
  return parsedData;
}

/**
 * Write parsedData object to a file whether it's CSV or plaintext
 * @param {string} fileType 
 * @param {object} data 
 */
function writeToFile(fileType, data) {
  /* 
   * Use board title for filename and remove all whitespace characters
   * Make fileType string all lowercase in case of edge case where user may enter "cSv" or "Txt" 
  */
  const resolvedPath = path.resolve(`./${data.title.replace(/\s/g, '')}.${fileType.toLowerCase()}`);

  // set variable for data content
  const dataContent = data.data;

  // write csv file using fast-csv
  if (/csv/i.test(fileType)) {
    csv.writeToPath(resolvedPath, dataContent)
      .on('error', error => { console.error(error); process.exit(); })
      .on('finish', () => { console.log(`Successfully written to file at: ${resolvedPath}`); process.exit(); })
  }
  // write plaintext file
  else if (/txt/i.test(fileType)) {
    fs.writeFile(resolvedPath, dataContent, (error) => {
      if (error) {
        throw error;
      } else {
        console.log(`Successfully written to file at: ${resolvedPath}`);
      }
      process.exit();
    });
  }
}

function handleError(error) {
  console.error(error);
}

/**
 * Initiate run function and pass the extension variable
 * If run is successful then initiate writeToFile function and finish
 * If run is not successful then throw an error
 */
run(extension).then((data) => writeToFile(extension, data)).catch(handleError);