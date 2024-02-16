const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const app = express();
app.use(express.json());

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

app.get(process.env.API_ENDPOINT, async (req, res) => {
  let options = {};

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [
        ...chrome.args,
        "--hide-scrollbars",
        "--disable-web-security",
        "--disable-features=SameSiteByDefaultCookies",
      ],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  } else {
    options = {
      headless: true,
      args: [
        "--disable-web-security",
        "--disable-features=SameSiteByDefaultCookies",
      ],
    };
  }

  const siswa = async () => {
    // DEV TESTING
    // const browser = await puppeteer.launch({
    //   headless: false,
    //   defaultViewport: false,
    //   args: [
    //     "--disable-web-security",
    //     "--disable-features=SameSiteByDefaultCookies",
    //   ],
    // });

    // LAUNCH PUPPETEER
    let browser = await puppeteer.launch(options);

    const page = await browser.newPage();
    await page.goto(process.env.API_URL);

    const kelas = await page.waitForSelector('select[name="class"]');
    await kelas.select(`${req.params.kelas}`);

    const search = await page.waitForSelector("#button-search");
    await search.click();

    // Define a function to check if the button is displayed
    const checkButtonDisplayed = async () => {
      const button = await page.$(".btn-load-more");
      if (button) {
        const style = await button.evaluate((node) => node.style.display);
        return style !== "none";
      }
      return false;
    };

    // Set up an interval to trigger load_more every 10 seconds if the button is displayed
    let i = 1;
    const interval = setInterval(async () => {
      if (await checkButtonDisplayed()) {
        await page.evaluate(() => {
          load_more();
        });
        console.log(`loading data, page ${i} ...`);
        i++;
      } else {
        clearInterval(interval);
        console.log("Data loaded successfully");
        const students = await page.evaluate(() => {
          const studentElements = document.querySelectorAll(".card-siswa");
          const studentsData = [];

          studentElements.forEach((element, index) => {
            const urut = index + 1;
            const name = element.querySelector(".dz-name").textContent.trim();
            const nisn = element
              .querySelector(".dz-position")
              .textContent.trim()
              .replace("NIS", "")
              .trim();

            studentsData.push({ urut, name, nisn });
          });

          return studentsData;
        });

        // Print the name and NISN of each student
        // console.log(JSON.stringify(students, null, 2));
        res.json(students);
      }
    }, 1000);
  };

  // RUN
  siswa();
});

// START SERVER
app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
