// IMPORT LIBRARY
const express = require("express");
const dotenv = require("dotenv");
const puppeteer = require("puppeteer");

// MIDDLEWARE
dotenv.config();
const app = express();
app.use(express.json());

// ENDPOINT
app.get("/api/siswa/:kelas", async (req, res) => {
  // LAUNCH PUPPETEER
  const siswa = async () => {
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: false,
      args: [
        "--disable-web-security",
        "--disable-features=SameSiteByDefaultCookies",
      ],
    });

    // NEW PAGE
    const page = await browser.newPage();

    // DIRECT TO MAN 2 API
    await page.goto(process.env.API_URL);

    // FIND KELAS
    const kelas = await page.waitForSelector('select[name="class"]');
    await kelas.select(`${req.params.kelas}`);

    // FILTER BUTTON
    const search = await page.waitForSelector("#button-search");
    await search.click();

    // CHECKING IS THE LOAD MORE BUTTON VISIBLE ?
    const checkButtonDisplayed = async () => {
      const button = await page.$(".btn-load-more");
      if (button) {
        const style = await button.evaluate((node) => node.style.display);
        return style !== "none";
      }
      return false;
    };

    // EXTRACT DATA
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

        // STORING DATA
        const students = await page.evaluate(() => {
          const studentElements = document.querySelectorAll(".card-siswa");
          const studentsData = [];

          // PUSH TO ARRAY
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

        // RESPONSE DATA
        res.json({data:students});
      }
    }, 1000);
  };

  // RUN
  await siswa();
});

// START SERVER
app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});
