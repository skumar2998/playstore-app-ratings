const axios = require("axios");
const express = require("express");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const app = express();

function evaluateDocument(document, xPath, returnType) {
  return document.evaluate(xPath, document, null, returnType, null);
}

async function getBase64Png(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return (
    "data:image/png;base64," +
    Buffer.from(response.data, "binary").toString("base64")
  );
}

function renderSVG(data, width) {
  const height = 80;
  const padding = 5;
  const imgSize = height - padding - padding;
  const imgRadius = imgSize / 5;
  const radius = height / 4;
  const bgColor = "white"; //"#e6e6e6"
  const imgBorder = "#e6e6e6";
  const textX = padding + imgSize + 10;
  const textFirstY = padding - 2;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <clipPath id="clipPath">
      <rect x="${padding}" y="${padding}"  width="${imgSize}" height="${imgSize}" rx="${imgRadius}"/>
      </clipPath>
      <rect width="${width}" height="${height}" style="fill:${bgColor}" rx="${radius}"/>
      <rect width="${imgSize + 2}" height="${
    imgSize + 2
    }" style="fill:${imgBorder}" x="${padding - 1}" y="${
    padding - 1
    }" rx="${imgRadius}"/>
      <image href="${
    data.image
    }" width="${imgSize}" height="${imgSize}" x="${padding}" y="${padding}" clip-path="url(#clipPath)" />
      <text x="${textX}" y="${
    textFirstY + 20
    }" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Helvetica, sans-serif">
     <![CDATA[${data.title}]]></text>
      <text x="${textX}" y="${
    textFirstY + 43
    }" font-size="15" font-family="-apple-system, BlinkMacSystemFont, Helvetica, sans-serif">v${
    data.latestVersion
    } - ${data.lastUpdated}</text>
      <text x="${textX}" y="${
    textFirstY + 66
    }" font-size="15" font-family="-apple-system, BlinkMacSystemFont, Helvetica, sans-serif">${
    data.rating
    } ★ - ${data.totalRatings} ratings</text>
    </svg>
    `;
}
app.get("/", async (req, res) => {
  try {
    const { id, country = "us", width = 400 } = req.query;
    const response = await axios.get(
      `https://play.google.com/store/apps/details?id=${id}&gl=${country}`
    );
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    //XPATHS
    const titleXpath =
      "/html/body/div[1]/div[4]/c-wiz/div/div[2]/div/div/main/c-wiz[1]/c-wiz[1]/div/div[2]/div/div[1]/c-wiz[1]/h1/span";
    const ratingXpath =
      "/html/body/div/div[4]/c-wiz/div/div[2]/div/div/main/c-wiz[2]/div[1]/c-wiz/div[1]/div[1]";
    const imageXpath =
      "/html/body/div[1]/div[4]/c-wiz/div/div[2]/div/div/main/c-wiz[1]/c-wiz[1]/div/div[1]/div/img";
    const lastUpdatedXpath =
      "/html/body/div/div[4]/c-wiz/div/div[2]/div/div/main/c-wiz[3]/div[1]/div[2]/div/div[1]/span/div/span";
    const totalRatingsXpath =
      "/html/body/div/div[4]/c-wiz/div/div[2]/div/div/main/c-wiz[2]/div[1]/c-wiz/div[1]/span";
    const latestVersionXpath =
      "/html/body/div/div[4]/c-wiz/div/div[2]/div/div/main/c-wiz[3]/div[1]/div[2]/div/div[4]/span/div/span";


    //Evaluated Nodes
    const titleNode = evaluateDocument(document, titleXpath, 2);
    const ratingNode = evaluateDocument(document, ratingXpath, 2);
    const lastUpdatedNode = evaluateDocument(document, lastUpdatedXpath, 2);
    const imageNode = evaluateDocument(document, imageXpath, 9);
    const totalRatingsNode = evaluateDocument(document, totalRatingsXpath, 2);
    const latestVersionNode = evaluateDocument(document, latestVersionXpath, 2);

    const data = {
      title: titleNode.stringValue,
      rating: ratingNode.stringValue,
      image: await getBase64Png(imageNode.singleNodeValue.attributes.src.value),
      lastUpdated: lastUpdatedNode.stringValue,
      totalRatings: totalRatingsNode.stringValue,
      latestVersion: latestVersionNode.stringValue,
    };

    console.log(data);

    res.header("Content-Type", "image/svg+xml");
    res.header("Cache-Control", "max-age=43200");
    res.send(renderSVG(data, width));
    // res.send(response.data);
  } catch (e) {
    console.log(e);
    res.send("Error fetching data");
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("server started");
});
