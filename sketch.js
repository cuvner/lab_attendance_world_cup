// House colours
const HC = {
  Anning: { f: "#5DCAA5", t: "#085041" },
  Einstein: { f: "#85B7EB", t: "#0C447C" },
  Kahlo: { f: "#FAC775", t: "#633806" },
  Attenborough: { f: "#97C459", t: "#27500A" },
  "Da Vinci": { f: "#ED93B1", t: "#72243E" },
};

// Default matches shown until the Google Sheet loads.
let MATCHES_L = [
  { t1: { yr: 10, h: "Da Vinci" }, t2: { yr: 8, h: "Attenborough" } },
  { t1: { yr: 10, h: "Einstein" }, t2: { yr: 9, h: "Attenborough" } },
  { t1: { yr: 8, h: "Da Vinci" }, t2: { yr: 10, h: "Attenborough" } },
  { t1: { yr: 9, h: "Da Vinci" }, t2: { yr: 9, h: "Kahlo" } },
  { t1: { yr: 7, h: "Anning" }, t2: { yr: 10, h: "Kahlo" } },
];

let MATCHES_R = [
  { t1: { yr: 10, h: "Anning" }, t2: { yr: 9, h: "Einstein" } },
  { t1: { yr: 8, h: "Kahlo" }, t2: { yr: 8, h: "Einstein" } },
  { t1: { yr: 9, h: "Anning" }, t2: { yr: 7, h: "Einstein" } },
  { t1: { yr: 7, h: "Attenborough" }, t2: { yr: 8, h: "Anning" } },
  { t1: { yr: 7, h: "Kahlo" }, t2: { yr: 7, h: "Da Vinci" } },
];

let ALL_MATCHES = [];
resetMatchIds();

let CW = 860;
let CH = 580;
const BR = 29;
const FOOTBALL_IMAGE_SCALE = 2.86;
const BASE_BALL_SPEED = 2.9;
const KICK_SPEED = 9.5;
const SPEED_RETURN_RATE = 0.965;
const AUTO_SECS = 120;
const DATA_REFRESH_SECS = 30;
let ZONE = { x1: 0, x2: CW, y1: 0, y2: CH };

// Paste your published Google Sheet CSV link here.
// Required columns:
// match,side,team1_year,team1_house,score1,team2_year,team2_house,score2
// side can be left/right or L/R. If side is blank, matches are split evenly.
// Example rows:
// match,side,team1_year,team1_house,score1,team2_year,team2_house,score2
// 1,left,10,Da Vinci,94.5,8,Attenborough,88.2
// 2,left,10,Einstein,91,9,Attenborough,90.5
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWZdyZnJNHIb1bXEIHlAljq7qyjlrROF0Y8wChxn_sksdTSdNL2evHTvWECGznbE3oufIG7Tw5heB2/pub?output=csv";

let focusMatch = 0;
let autoRotate = true;
let lastTime = 0;
let lastDataLoad = -Infinity;
let loadingData = false;
let dataStatus = "Add your Google Sheet CSV URL in sketch.js";
let animFrame = 0;

let bx = CW / 2;
let by = CH / 2;
let bvx = 2.3;
let bvy = 1.8;

let footballImg;
let grassImg;
let titleFontReady = false;

function setup() {
  loadGoogleFonts();
  setSketchSize();
  bx = CW / 2;
  by = CH / 2;
  const canvas = createCanvas(CW, CH);
  if (document.getElementById("sketch-holder")) {
    canvas.parent("sketch-holder");
  }
  textFont("Lexend, system-ui, sans-serif");
  frameRate(30);

  loadAssets();
  lastTime = millis();
  loadAttendanceData();
}

function loadGoogleFonts() {
  if (document.getElementById("lab-google-fonts")) {
    return;
  }

  const preconnectGoogle = document.createElement("link");
  preconnectGoogle.rel = "preconnect";
  preconnectGoogle.href = "https://fonts.googleapis.com";
  document.head.appendChild(preconnectGoogle);

  const preconnectGstatic = document.createElement("link");
  preconnectGstatic.rel = "preconnect";
  preconnectGstatic.href = "https://fonts.gstatic.com";
  preconnectGstatic.crossOrigin = "anonymous";
  document.head.appendChild(preconnectGstatic);

  const fontLink = document.createElement("link");
  fontLink.id = "lab-google-fonts";
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Bitcount+Ink:wght@100..900&family=Kalam:wght@300;400;700&family=Lexend:wght@100..900&family=Risque&display=swap";
  document.head.appendChild(fontLink);

  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 32px "Bitcount Ink"').then(() => {
      titleFontReady = true;
    });
  }
}

function draw() {
  drawGrassBackground();
  animFrame++;

  moveFootball();

  drawSide(MATCHES_L, 8, true);
  drawSide(MATCHES_R, CW - 8, false);
  drawCentreDetails();
  drawFootball(bx, by, BR);
  drawFocusGlow();
  drawCountdown();
  maybeRefreshAttendanceData();
}

function loadAssets() {
  loadImageFromPaths([
    "images/football.png",
    "football.png",
  ], (img) => {
    footballImg = img;
  });

  loadImageFromPaths([
    "images/grass.jpg",
    "images/grass.png",
    "grass.jpg",
    "grass.png",
  ], (img) => {
    grassImg = img;
  });
}

function loadImageFromPaths(paths, onLoad) {
  let index = 0;

  function tryNextPath() {
    if (index >= paths.length) {
      console.warn(`Could not load image from any path: ${paths.join(", ")}`);
      return;
    }

    const path = paths[index];
    index++;

    loadImage(
      path,
      (img) => onLoad(img),
      () => tryNextPath(),
    );
  }

  tryNextPath();
}

function updateDataStatus() {
  console.log(dataStatus);
}

function windowResized() {
  setSketchSize();
  resizeCanvas(CW, CH);
  bx = constrain(bx, ZONE.x1 + BR, ZONE.x2 - BR);
  by = constrain(by, ZONE.y1 + BR, ZONE.y2 - BR);
}

function mousePressed() {
  const hitRadius = max(BR, (BR * FOOTBALL_IMAGE_SCALE) / 2);

  if (dist(mouseX, mouseY, bx, by) > hitRadius) {
    return;
  }

  let kickX = bx - mouseX;
  let kickY = by - mouseY;
  const kickLength = sqrt(kickX * kickX + kickY * kickY);

  if (kickLength < 0.1) {
    const currentLength = sqrt(bvx * bvx + bvy * bvy) || 1;
    kickX = bvx / currentLength;
    kickY = bvy / currentLength;
  } else {
    kickX /= kickLength;
    kickY /= kickLength;
  }

  bvx += kickX * KICK_SPEED;
  bvy += kickY * KICK_SPEED;
}

function setSketchSize() {
  CW = windowWidth;
  CH = windowHeight;
  ZONE = { x1: 0, x2: CW, y1: 0, y2: CH };
}

function drawGrassBackground() {
  if (grassImg && grassImg.width > 0) {
    image(grassImg, 0, 0, CW, CH);
    fill(0, 0, 0, 35);
    noStroke();
    rect(0, 0, CW, CH);
  } else {
    background(0);
  }
}

function maybeRefreshAttendanceData() {
  if (!GOOGLE_SHEET_CSV_URL || loadingData) {
    return;
  }

  if ((millis() - lastDataLoad) / 1000 >= DATA_REFRESH_SECS) {
    loadAttendanceData();
  }
}

async function loadAttendanceData() {
  if (!GOOGLE_SHEET_CSV_URL) {
    dataStatus =
      "Add your published Google Sheet CSV URL in sketch.js to load attendance automatically.";
    updateDataStatus();
    return;
  }

  loadingData = true;
  dataStatus = "Loading attendance from Google Sheet...";
  updateDataStatus();

  try {
    const { updated, source } = await loadAndApplySheetRows();
    const loadedAt = new Date().toLocaleTimeString();

    lastDataLoad = millis();
    dataStatus = `Loaded ${updated} matches and scores from Google Sheet at ${loadedAt} (${source}).`;
    updateDataStatus();
  } catch (error) {
    dataStatus = `Could not load Google Sheet: ${error.message}`;
    updateDataStatus();
  } finally {
    lastDataLoad = millis();
    loadingData = false;
  }
}

async function loadAndApplySheetRows() {
  try {
    const csvRows = await loadSheetRowsWithFetch();
    return { updated: applyAttendanceRows(csvRows), source: "CSV" };
  } catch (csvError) {
    try {
      const jsonpRows = await loadSheetRowsWithJsonp();
      return {
        updated: applyAttendanceRows(jsonpRows),
        source: "JSONP fallback",
      };
    } catch (jsonpError) {
      throw new Error(`${jsonpError.message}. CSV fallback also failed: ${csvError.message}`);
    }
  }
}

async function loadSheetRowsWithFetch() {
  const url = addCacheBuster(buildPublishedCsvUrl());
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Sheet request failed: ${response.status}`);
  }

  return parseCsv(await response.text());
}

function buildPublishedCsvUrl() {
  const match = GOOGLE_SHEET_CSV_URL.match(/\/spreadsheets\/d\/e\/([^/]+)/);

  if (!match) {
    return GOOGLE_SHEET_CSV_URL;
  }

  const sheetId = match[1];
  const gid = getUrlParam(GOOGLE_SHEET_CSV_URL, "gid");
  let url = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv`;

  if (gid) {
    url += `&gid=${encodeURIComponent(gid)}&single=true`;
  }

  return url;
}

function loadSheetRowsWithJsonp() {
  return new Promise((resolve, reject) => {
    const callbackName = `handleSheetData_${Date.now()}_${floor(random(100000))}`;
    const script = document.createElement("script");
    let timeoutId;

    window[callbackName] = (response) => {
      cleanup();

      try {
        resolve(gvizResponseToRows(response));
      } catch (error) {
        reject(error);
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Google Sheet JSONP request failed"));
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheet request timed out"));
    }, 10000);

    script.src = addCacheBuster(buildGvizJsonpUrl(callbackName));
    document.body.appendChild(script);

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }
  });
}

function buildGvizJsonpUrl(callbackName) {
  const match = GOOGLE_SHEET_CSV_URL.match(/\/spreadsheets\/d\/e\/([^/]+)/);

  if (!match) {
    throw new Error("Could not read published sheet id from URL");
  }

  const sheetId = match[1];
  const gid = getUrlParam(GOOGLE_SHEET_CSV_URL, "gid");
  let url = `https://docs.google.com/spreadsheets/d/e/${sheetId}/gviz/tq?tqx=responseHandler:${callbackName}&tq=select%20*`;

  if (gid) {
    url += `&gid=${encodeURIComponent(gid)}`;
  }

  return url;
}

function getUrlParam(url, name) {
  const match = url.match(new RegExp(`[?&]${name}=([^&]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function gvizResponseToRows(response) {
  if (!response || response.status !== "ok" || !response.table) {
    throw new Error("Google Sheet JSONP response was not valid");
  }

  const headers = response.table.cols.map((col) => col.label || col.id || "");
  const rows = response.table.rows.map((row) =>
    response.table.cols.map((_, index) => {
      const cell = row.c[index];

      if (!cell) {
        return "";
      }

      if (cell.f !== undefined) {
        return String(cell.f);
      }

      if (cell.v !== undefined) {
        return String(cell.v);
      }

      return "";
    }),
  );

  if (!hasRequiredHeaders(headers) && rows.length > 0 && hasRequiredHeaders(rows[0])) {
    return rows;
  }

  return [headers, ...rows];
}

function hasRequiredHeaders(row) {
  const headers = row.map(normaliseHeader);

  return (
    findColumn(headers, ["match", "matchnumber", "matchno"]) !== -1 &&
    findColumn(headers, ["team1year", "t1year", "year1", "yr1"]) !== -1 &&
    findColumn(headers, ["team1house", "t1house", "house1"]) !== -1 &&
    findColumn(headers, ["score1", "team1score", "attendance1", "team1attendance", "s1"]) !== -1 &&
    findColumn(headers, ["team2year", "t2year", "year2", "yr2"]) !== -1 &&
    findColumn(headers, ["team2house", "t2house", "house2"]) !== -1 &&
    findColumn(headers, ["score2", "team2score", "attendance2", "team2attendance", "s2"]) !== -1
  );
}

function addCacheBuster(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_=${Date.now()}`;
}

function applyAttendanceRows(rows) {
  if (rows.length < 2) {
    throw new Error("CSV has no data rows");
  }

  const headers = rows[0].map(normaliseHeader);
  const matchCol = findColumn(headers, ["match", "matchnumber", "matchno"]);
  const sideCol = findColumn(headers, ["side", "bracketside"]);
  const team1YearCol = findColumn(headers, [
    "team1year",
    "t1year",
    "year1",
    "yr1",
  ]);
  const team1HouseCol = findColumn(headers, [
    "team1house",
    "t1house",
    "house1",
  ]);
  const score1Col = findColumn(headers, [
    "score1",
    "team1score",
    "attendance1",
    "team1attendance",
    "s1",
  ]);
  const team2YearCol = findColumn(headers, [
    "team2year",
    "t2year",
    "year2",
    "yr2",
  ]);
  const team2HouseCol = findColumn(headers, [
    "team2house",
    "t2house",
    "house2",
  ]);
  const score2Col = findColumn(headers, [
    "score2",
    "team2score",
    "attendance2",
    "team2attendance",
    "s2",
  ]);

  if (
    matchCol === -1 ||
    team1YearCol === -1 ||
    team1HouseCol === -1 ||
    score1Col === -1 ||
    team2YearCol === -1 ||
    team2HouseCol === -1 ||
    score2Col === -1
  ) {
    throw new Error(
      "CSV needs match, team1_year, team1_house, score1, team2_year, team2_house, score2",
    );
  }

  const parsedMatches = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const matchNumber = Number.parseInt(row[matchCol], 10);
    const team1Year = Number.parseInt(row[team1YearCol], 10);
    const team2Year = Number.parseInt(row[team2YearCol], 10);
    const team1House = cleanText(row[team1HouseCol]);
    const team2House = cleanText(row[team2HouseCol]);

    if (
      !matchNumber ||
      !team1Year ||
      !team2Year ||
      !team1House ||
      !team2House
    ) {
      continue;
    }

    parsedMatches.push({
      matchNumber,
      side: sideCol === -1 ? "" : normaliseSide(row[sideCol]),
      t1: { yr: team1Year, h: team1House },
      t2: { yr: team2Year, h: team2House },
      s1: cleanScore(row[score1Col]),
      s2: cleanScore(row[score2Col]),
    });
  }

  if (parsedMatches.length === 0) {
    throw new Error("CSV did not contain any valid match rows");
  }

  parsedMatches.sort((a, b) => a.matchNumber - b.matchNumber);
  setMatchesFromSheet(parsedMatches);

  return parsedMatches.length;
}

function setMatchesFromSheet(matches) {
  const hasSides = matches.some((match) => match.side);

  if (hasSides) {
    MATCHES_L = matches.filter((match) => match.side !== "right");
    MATCHES_R = matches.filter((match) => match.side === "right");
  } else {
    const splitAt = ceil(matches.length / 2);
    MATCHES_L = matches.slice(0, splitAt);
    MATCHES_R = matches.slice(splitAt);
  }

  resetMatchIds();

  if (focusMatch >= ALL_MATCHES.length) {
    focusMatch = 0;
  }
}

function resetMatchIds() {
  ALL_MATCHES = [...MATCHES_L, ...MATCHES_R];
  ALL_MATCHES.forEach((match, index) => {
    match.s1 = match.s1 || "";
    match.s2 = match.s2 || "";
    match.id = index;
  });
}

function findColumn(headers, names) {
  return headers.findIndex((header) => names.includes(header));
}

function normaliseHeader(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cleanScore(value) {
  const parsed = float(String(value).replace("%", "").trim());

  if (Number.isNaN(parsed)) {
    return "";
  }

  return String(constrain(parsed, 0, 100));
}

function cleanText(value) {
  return String(value || "").trim();
}

function normaliseSide(value) {
  const side = cleanText(value).toLowerCase();

  if (side === "r" || side === "right") {
    return "right";
  }

  if (side === "l" || side === "left") {
    return "left";
  }

  return "";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function moveFootball() {
  bx += bvx;
  by += bvy;

  if (bx - BR < ZONE.x1) {
    bx = ZONE.x1 + BR;
    bvx = abs(bvx);
  }
  if (bx + BR > ZONE.x2) {
    bx = ZONE.x2 - BR;
    bvx = -abs(bvx);
  }
  if (by - BR < ZONE.y1) {
    by = ZONE.y1 + BR;
    bvy = abs(bvy);
  }
  if (by + BR > ZONE.y2) {
    by = ZONE.y2 - BR;
    bvy = -abs(bvy);
  }

  easeBallBackToNormalSpeed();
}

function easeBallBackToNormalSpeed() {
  const speed = sqrt(bvx * bvx + bvy * bvy);

  if (speed <= BASE_BALL_SPEED) {
    return;
  }

  const nextSpeed = max(BASE_BALL_SPEED, speed * SPEED_RETURN_RATE);
  const scale = nextSpeed / speed;
  bvx *= scale;
  bvy *= scale;
}

function drawCentreDetails() {
  stroke(255, 255, 255, 90);
  strokeWeight(1.2);
  line(CW / 2, 170, CW / 2, CH - 42);
  noStroke();

  const boxW = min(CW - 40, 780);
  const boxH = 172;
  const boxX = CW / 2 - boxW / 2;
  const boxY = 12;

  drawingContext.shadowColor = "rgba(0, 0, 0, 0.75)";
  drawingContext.shadowBlur = 22;
  drawingContext.shadowOffsetX = 0;
  drawingContext.shadowOffsetY = 8;
  fill(0, 0, 0, 225);
  rect(boxX, boxY, boxW, boxH, 6);
  drawingContext.shadowColor = "transparent";
  drawingContext.shadowBlur = 0;
  drawingContext.shadowOffsetX = 0;
  drawingContext.shadowOffsetY = 0;

  fill(255);
  textFont(titleFontReady ? "Bitcount Ink" : "Lexend");
  textSize(64);
  textStyle(BOLD);
  textAlign(CENTER);
  text("LAB", CW / 2, 58);
  text("ATTENDANCE", CW / 2, 112);
  text("WORLD CUP", CW / 2, 166);
  textFont("Lexend");
  textStyle(NORMAL);
}

function drawCountdown() {
  if (!autoRotate) {
    return;
  }

  const elapsed = (millis() - lastTime) / 1000;
  const remain = max(0, AUTO_SECS - elapsed);

  if (elapsed >= AUTO_SECS && ALL_MATCHES.length > 0) {
    focusMatch = (focusMatch + 1) % ALL_MATCHES.length;
    lastTime = millis();
  }
}

function drawFocusGlow() {
  if (ALL_MATCHES.length === 0) {
    return;
  }

  const pulse = 0.5 + 0.5 * sin(animFrame * 0.09);

  fill(255, 215, 40, round(6 + 7 * pulse));
  noStroke();

  if (focusMatch < MATCHES_L.length) {
    rect(0, 0, 230, CH);
  } else {
    rect(CW - 230, 0, 230, CH);
  }
}

function drawSide(matches, edgeX, isLeft) {
  const barHeight = 48;
  const gap = 8;
  const matchGap = 34;
  const barWidth = min(360, max(250, CW * 0.28));
  const totalHeight =
    matches.length * (barHeight * 2 + gap) + (matches.length - 1) * matchGap;
  const startY = (CH - totalHeight) / 2;

  matches.forEach((match, index) => {
    const y = startY + index * (barHeight * 2 + gap + matchGap);
    const winner = getWinner(match);
    const hasScores = match.s1 !== "" && match.s2 !== "";
    const t1Wins = hasScores && winner === match.t1;
    const t2Wins = hasScores && winner === match.t2;
    const focused = match.id === focusMatch;
    const x = isLeft ? edgeX : edgeX - barWidth;

    teamBar(
      x,
      y,
      barWidth,
      barHeight,
      match.t1,
      match.s1,
      isLeft,
      t1Wins,
      t2Wins,
      focused,
    );
    teamBar(
      x,
      y + barHeight + gap,
      barWidth,
      barHeight,
      match.t2,
      match.s2,
      isLeft,
      t2Wins,
      t1Wins,
      focused,
    );
    drawBracketConnector(edgeX, y, barHeight, gap, barWidth, isLeft);
  });
}

function drawBracketConnector(edgeX, y, barHeight, gap, barWidth, isLeft) {
  const cx = isLeft ? edgeX + barWidth + 1 : edgeX - barWidth - 1;
  const y1 = y + barHeight / 2;
  const y2 = y + barHeight + gap + barHeight / 2;
  const middleY = (y1 + y2) / 2;
  const arm = 16;
  const dir = isLeft ? 1 : -1;

  stroke(192, 190, 184);
  strokeWeight(1.6);
  noFill();

  line(cx, y1, cx + arm * dir, y1);
  line(cx + arm * dir, y1, cx + arm * dir, middleY);
  line(cx, y2, cx + arm * dir, y2);
  line(cx + arm * dir, y2, cx + arm * dir, middleY);
  line(cx + arm * dir, middleY, cx + arm * 2 * dir, middleY);

  noStroke();
}

function teamBar(x, y, w, h, team, score, isLeft, isWin, isLose, focused) {
  const houseColour = HC[team.h] || { f: "#cccccc", t: "#444444" };
  const fillColour = hexToRgb(houseColour.f);
  const textColour = hexToRgb(houseColour.t);
  const alpha = isLose ? 85 : 215;

  fill(224, 222, 217, 170);
  noStroke();
  rect(x, y, w, h, 6);

  const percent = score === "" ? 0 : min(float(score) || 0, 100) / 100;
  const fillWidth = round(w * percent);

  if (fillWidth > 0) {
    fill(fillColour.r, fillColour.g, fillColour.b, alpha + 25);
    if (isLeft) {
      rect(x, y, fillWidth, h, 6);
    } else {
      rect(x + w - fillWidth, y, fillWidth, h, 6);
    }
  }

  if (focused) {
    const pulse = 0.5 + 0.5 * sin(animFrame * 0.14);
    noFill();
    stroke(fillColour.r, fillColour.g, fillColour.b, round(110 + 110 * pulse));
    strokeWeight(3);
    rect(x - 2, y - 2, w + 4, h + 4, 8);
    noStroke();
  }

  drawYearBadge(x, y, w, team, isLeft, fillColour, textColour);
  drawHouseName(x, y, w, h, team, isLeft, isWin, textColour);
  drawScore(x, y, w, h, score, isLeft, isWin, isLose);
}

function drawYearBadge(x, y, w, team, isLeft, fillColour, textColour) {
  const badgeW = 40;
  const badgeH = 24;
  const badgeX = isLeft ? x + 6 : x + w - badgeW - 6;

  fill(fillColour.r, fillColour.g, fillColour.b, 210);
  noStroke();
  rect(badgeX, y + 6, badgeW, badgeH, 4);

  fill(textColour.r, textColour.g, textColour.b);
  textSize(16);
  textStyle(BOLD);
  textAlign(CENTER);
  text(`Y${team.yr}`, badgeX + badgeW / 2, y + 24);
}

function drawHouseName(x, y, w, h, team, isLeft, isWin, textColour) {
  fill(textColour.r, textColour.g, textColour.b);
  textSize(21);
  textStyle(isWin ? BOLD : NORMAL);

  if (isLeft) {
    textAlign(LEFT);
    text(team.h, x + 54, y + h / 2 + 8);
  } else {
    textAlign(RIGHT);
    text(team.h, x + w - 54, y + h / 2 + 8);
  }

  textStyle(NORMAL);
}

function drawScore(x, y, w, h, score, isLeft, isWin, isLose) {
  if (score === "") {
    return;
  }

  const scoreValue = float(score);

  if (Number.isNaN(scoreValue)) {
    return;
  }

  fill(isLose ? 150 : 30, isLose ? 148 : 28, isLose ? 144 : 24);
  textSize(20);
  textStyle(isWin ? BOLD : NORMAL);

  if (isLeft) {
    textAlign(RIGHT);
    text(`${scoreValue.toFixed(1)}%`, x + w - 8, y + h / 2 + 8);
  } else {
    textAlign(LEFT);
    text(`${scoreValue.toFixed(1)}%`, x + 8, y + h / 2 + 8);
  }

  if (isWin) {
    fill(185, 152, 0);
    textSize(22);

    if (isLeft) {
      textAlign(RIGHT);
      text("*", x + w - 8, y + h / 2 + 8);
    } else {
      textAlign(LEFT);
      text("*", x + 8, y + h / 2 + 8);
    }
  }

  textStyle(NORMAL);
}

function drawFootball(x, y, r) {
  if (footballImg && footballImg.width > 0) {
    push();
    imageMode(CENTER);
    translate(x, y);
    rotate(animFrame * 0.05);
    image(
      footballImg,
      0,
      0,
      r * FOOTBALL_IMAGE_SCALE,
      r * FOOTBALL_IMAGE_SCALE,
    );
    pop();
    return;
  }

  const spin = animFrame * 0.05;

  noStroke();
  fill(0, 0, 0, 18);
  ellipse(x + 4, y + 5, r * 2, r * 1.3);

  fill(242, 242, 238);
  stroke(55, 54, 48);
  strokeWeight(1.4);
  ellipse(x, y, r * 2, r * 2);

  fill(38, 37, 34);
  noStroke();
  ellipse(x, y, r * 0.58, r * 0.58);

  for (let i = 0; i < 5; i++) {
    const angle = spin + (i * TWO_PI) / 5;
    const patchX = x + cos(angle) * r * 0.48;
    const patchY = y + sin(angle) * r * 0.48;
    ellipse(patchX, patchY, r * 0.44, r * 0.44);
  }

  stroke(55, 54, 48);
  strokeWeight(0.7);
  noFill();

  for (let i = 0; i < 5; i++) {
    const angle = spin + (i * TWO_PI) / 5;
    line(x, y, x + cos(angle) * r * 0.26, y + sin(angle) * r * 0.26);
  }

  noStroke();
}

function teamName(team) {
  return `Y${team.yr} ${team.h}`;
}

function getWinner(match) {
  if (match.s1 === "" || match.s2 === "") {
    return null;
  }

  return float(match.s1) >= float(match.s2) ? match.t1 : match.t2;
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
