// House colours
const HC = {
  Anning: { f: "#2FB85F", t: "#063A1D" },
  Einstein: { f: "#E94B4B", t: "#5A0808" },
  Kahlo: { f: "#FAC775", t: "#633806" },
  Attenborough: { f: "#8E44AD", t: "#2B0B3F" },
  "Da Vinci": { f: "#3B82F6", t: "#082D63" },
};

const HOUSE_NAME_ALIASES = {
  aning: "Anning",
  anning: "Anning",
  einstien: "Einstein",
  einstein: "Einstein",
  kahlo: "Kahlo",
  kahloo: "Kahlo",
  attenborough: "Attenborough",
  attenburough: "Attenborough",
  attenbrough: "Attenborough",
  attenborugh: "Attenborough",
  attenboro: "Attenborough",
  davinci: "Da Vinci",
  davinci: "Da Vinci",
  "da vinci": "Da Vinci",
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
let ROUND_GROUPS = [];
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
const MIN_LOADING_SCREEN_MS = 10000;
let ZONE = { x1: 0, x2: CW, y1: 0, y2: CH };

// Paste your published Google Sheet CSV link here.
// Preferred columns for spreadsheet-controlled rounds:
// round,draw_date,draw_time,team_year,team_house,attendance
// The online spreadsheet controls ordering and match draws.
// Rows are paired in their sheet order: 1v2, 3v4, 5v6...
// Legacy explicit-match columns are still supported:
// match,side,team1_year,team1_house,score1,team2_year,team2_house,score2
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWZdyZnJNHIb1bXEIHlAljq7qyjlrROF0Y8wChxn_sksdTSdNL2evHTvWECGznbE3oufIG7Tw5heB2/pub?output=csv";

let currentRoundLabel = "ROUND 1";

let focusMatch = 0;
let autoRotate = true;
let lastTime = 0;
let lastDataLoad = -Infinity;
let loadingData = false;
let sheetDataReady = false;
let initialLoadSettled = false;
let initialLoadingStartedAt = 0;
let dataStatus = "Add your Google Sheet CSV URL in sketch.js";
let animFrame = 0;

let bx = CW / 2;
let by = CH / 2;
let bvx = 2.3;
let bvy = 1.8;

let footballImg;
let grassImg;
let houseLogos = {};
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
  initialLoadingStartedAt = millis();

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

  if (shouldShowLoadingScreen()) {
    drawLoadingScreen();
    return;
  }

  moveFootball();

  if (ROUND_GROUPS.length > 1) {
    drawBracketRounds();
  } else {
    drawSide(MATCHES_L, 8, true);
    drawSide(MATCHES_R, CW - 8, false);
  }
  drawCentreDetails();
  drawFootball(bx, by, BR);
  drawFocusGlow();
  drawWinnersBanner();
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

  loadHouseLogo("Da Vinci", ["images/DaVinci.png", "DaVinci.png"]);
  loadHouseLogo("Kahlo", ["images/Kahlo.png", "Kahlo.png"]);
  loadHouseLogo("Anning", ["images/Anning.png", "Anning.png"]);
  loadHouseLogo("Einstein", ["images/Einstein logo.png", "Einstein logo.png"]);
  loadHouseLogo("Attenborough", ["images/attenborough.png", "attenborough.png"]);
}

function loadHouseLogo(house, paths) {
  loadImageFromPaths(paths, (img) => {
    houseLogos[house] = img;
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
  const isInitialLoad = lastDataLoad === -Infinity;

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

    sheetDataReady = true;
    lastDataLoad = millis();
    dataStatus = `Loaded ${updated} matches and scores from Google Sheet at ${loadedAt} (${source}).`;
    updateDataStatus();
  } catch (error) {
    dataStatus = `Could not load Google Sheet: ${error.message}`;
    updateDataStatus();
  } finally {
    lastDataLoad = millis();
    loadingData = false;

    if (isInitialLoad) {
      initialLoadSettled = true;
    }
  }
}

function shouldShowLoadingScreen() {
  if (!initialLoadSettled) {
    return true;
  }

  return millis() - initialLoadingStartedAt < MIN_LOADING_SCREEN_MS;
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

  return hasExplicitMatchHeaders(headers) || hasRoundTeamHeaders(headers);
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
  if (hasRoundTeamHeaders(headers)) {
    return applyRoundTeamRows(rows, headers);
  }

  if (hasExplicitMatchHeaders(headers)) {
    return applyExplicitMatchRows(rows, headers);
  }

  throw new Error(
    "CSV needs either round/team columns or explicit match columns",
  );
}

function hasExplicitMatchHeaders(headers) {
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

function hasRoundTeamHeaders(headers) {
  return (
    findColumn(headers, ["round", "roundnumber", "worldcupround"]) !== -1 &&
    findColumn(headers, ["teamyear", "year", "yr"]) !== -1 &&
    findColumn(headers, ["teamhouse", "house"]) !== -1 &&
    findColumn(headers, ["attendance", "score", "attendancescore"]) !== -1
  );
}

function applyExplicitMatchRows(rows, headers) {
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

  const parsedMatches = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const matchNumber = Number.parseInt(row[matchCol], 10);
    const team1Year = Number.parseInt(row[team1YearCol], 10);
    const team2Year = Number.parseInt(row[team2YearCol], 10);
    const team1House = canonicaliseHouseName(row[team1HouseCol]);
    const team2House = canonicaliseHouseName(row[team2HouseCol]);

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
  currentRoundLabel = "ROUND 1";
  setMatchesFromSheet(parsedMatches);

  return parsedMatches.length;
}

function applyRoundTeamRows(rows, headers) {
  const roundCol = findColumn(headers, ["round", "roundnumber", "worldcupround"]);
  const drawDateCol = findColumn(headers, ["drawdate", "date", "fridaydate"]);
  const drawTimeCol = findColumn(headers, ["drawtime", "time"]);
  const teamYearCol = findColumn(headers, ["teamyear", "year", "yr"]);
  const teamHouseCol = findColumn(headers, ["teamhouse", "house"]);
  const attendanceCol = findColumn(headers, ["attendance", "score", "attendancescore"]);
  const rounds = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const round = cleanText(row[roundCol]);
    const teamYear = Number.parseInt(row[teamYearCol], 10);
    const teamHouse = canonicaliseHouseName(row[teamHouseCol]);

    if (!round) {
      continue;
    }

    if (!rounds.has(round)) {
      rounds.set(round, {
        round,
        drawDate: drawDateCol === -1 ? "" : cleanText(row[drawDateCol]),
        drawTime: drawTimeCol === -1 ? "08:30" : cleanText(row[drawTimeCol]) || "08:30",
        teams: [],
      });
    }

    rounds.get(round).teams.push({
      yr: Number.isNaN(teamYear) ? "" : teamYear,
      h: teamHouse,
      attendance: cleanScore(row[attendanceCol]),
    });
  }

  const selectedRound = selectActiveRound([...rounds.values()]);

  if (!selectedRound || selectedRound.teams.length < 2) {
    throw new Error("CSV did not contain enough teams for a round draw");
  }

  setRoundGroupsFromSheet([...rounds.values()]);
  const selectedTeams = selectedRound.teams.filter((team) => !isBlankTeam(team));
  currentRoundLabel = `ROUND ${selectedRound.round}`;
  setMatchesFromSheet(buildMatchesFromOrderedTeams(selectedTeams));

  return ALL_MATCHES.length;
}

function setRoundGroupsFromSheet(rounds) {
  const sortedRounds = rounds
    .map((round) => ({
      ...round,
      drawAt: parseDrawDateTime(round.drawDate, round.drawTime),
    }))
    .sort((a, b) => {
      if (a.drawAt && b.drawAt) return a.drawAt - b.drawAt;
      return Number.parseFloat(a.round) - Number.parseFloat(b.round);
    });

  let expectedTeamCount = 0;

  ROUND_GROUPS = sortedRounds.map((round, index) => {
    const filledTeams = round.teams.filter((team) => !isBlankTeam(team));
    const isLastRound = index === sortedRounds.length - 1;
    const isSemiFinalRound = index === sortedRounds.length - 2;
    const inferredTeamCount =
      index === 0
        ? filledTeams.length
        : max(isLastRound ? 2 : 1, ceil(expectedTeamCount / 2));
    const targetTeamCount = filledTeams.length > 0 ? filledTeams.length : inferredTeamCount;
    const teams = padTeamsToCount(filledTeams, targetTeamCount);

    expectedTeamCount = targetTeamCount;

    return {
      round: round.round,
      drawDate: round.drawDate,
      drawTime: round.drawTime,
      drawAt: round.drawAt,
      matches: isLastRound
        ? buildFinalEntries(teams)
        : buildKnockoutMatchesFromOrderedTeams(teams, isSemiFinalRound),
    };
  });
}

function selectActiveRound(rounds) {
  const sortedRounds = rounds
    .map((round) => ({ ...round, drawAt: parseDrawDateTime(round.drawDate, round.drawTime) }))
    .sort((a, b) => {
      if (a.drawAt && b.drawAt) return a.drawAt - b.drawAt;
      return Number.parseFloat(a.round) - Number.parseFloat(b.round);
    });

  const now = new Date();
  const activeRounds = sortedRounds.filter((round) => !round.drawAt || round.drawAt <= now);

  return activeRounds.length > 0 ? activeRounds[activeRounds.length - 1] : sortedRounds[0];
}

function parseDrawDateTime(dateValue, timeValue) {
  if (!dateValue) {
    return null;
  }

  const isoDate = parseDrawDate(dateValue);
  const time = parseDrawTime(timeValue || "08:30");

  if (!isoDate) {
    return null;
  }

  const parsed = new Date(`${isoDate}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDrawTime(value) {
  const text = cleanText(value).replace(".", ":");
  const match = text.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return "08:30";
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function parseDrawDate(value) {
  const text = cleanText(value);
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  const ukMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (ukMatch) {
    return `${ukMatch[3]}-${ukMatch[2].padStart(2, "0")}-${ukMatch[1].padStart(2, "0")}`;
  }

  return "";
}

function compareTeamsForFairDraw(a, b) {
  const aBlank = isBlankTeam(a);
  const bBlank = isBlankTeam(b);

  if (aBlank && !bBlank) return 1;
  if (!aBlank && bBlank) return -1;

  const scoreA = a.attendance === "" ? -Infinity : float(a.attendance);
  const scoreB = b.attendance === "" ? -Infinity : float(b.attendance);

  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }

  return teamName(a).localeCompare(teamName(b));
}

function buildKnockoutMatchesFromOrderedTeams(teams, allowThreeTeamMatch = false) {
  const matches = [];
  let startIndex = 0;

  if (allowThreeTeamMatch && teams.length % 2 === 1) {
    const threeTeamMatch = teams.slice(0, 3);
    matches.push({
      matchNumber: matches.length + 1,
      teams: threeTeamMatch.map((team) => ({
        team: { yr: team.yr, h: team.h },
        score: team.attendance,
      })),
      threeTeamMatch: true,
    });
    startIndex = 3;
  } else if (teams.length % 2 === 1) {
    matches.push({
      matchNumber: matches.length + 1,
      t1: { yr: teams[0].yr, h: teams[0].h },
      t2: { yr: "", h: "BYE" },
      s1: teams[0].attendance,
      s2: "",
      bye: true,
    });
    startIndex = 1;
  }

  for (let i = startIndex; i < teams.length; i += 2) {
    const opponent = teams[i + 1] || {
      yr: "",
      h: "",
      attendance: "",
    };

    matches.push({
      matchNumber: matches.length + 1,
      t1: { yr: teams[i].yr, h: teams[i].h },
      t2: { yr: opponent.yr, h: opponent.h },
      s1: teams[i].attendance,
      s2: opponent.attendance,
    });
  }

  return matches;
}

function buildMatchesFromOrderedTeams(teams) {
  return buildKnockoutMatchesFromOrderedTeams(teams);
}

function buildFinalEntries(teams) {
  return padTeamsToCount(teams, 2).slice(0, 2).map((team, index) => ({
    matchNumber: index + 1,
    t1: { yr: team.yr, h: team.h },
    t2: { yr: "", h: "" },
    s1: team.attendance,
    s2: "",
    finalEntry: true,
  }));
}

function padTeamsToCount(teams, count) {
  const paddedTeams = teams.slice(0, count);

  while (paddedTeams.length < count) {
    paddedTeams.push({ yr: "", h: "", attendance: "" });
  }

  return paddedTeams;
}

function isBlankTeam(team) {
  return !team || (!team.yr && !team.h);
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

function canonicaliseHouseName(value) {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  if (text.toUpperCase() === "BYE") {
    return "BYE";
  }

  const directAlias = HOUSE_NAME_ALIASES[normaliseNameToken(text)];
  if (directAlias) {
    return directAlias;
  }

  const knownHouses = Object.keys(HC);
  const exactMatch = knownHouses.find(
    (house) => normaliseNameToken(house) === normaliseNameToken(text),
  );

  if (exactMatch) {
    return exactMatch;
  }

  let bestMatch = "";
  let bestDistance = Infinity;
  const target = normaliseNameToken(text);

  knownHouses.forEach((house) => {
    const distance = levenshteinDistance(target, normaliseNameToken(house));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = house;
    }
  });

  const maxDistance = target.length >= 9 ? 3 : 2;
  return bestDistance <= maxDistance ? bestMatch : text;
}

function normaliseNameToken(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function levenshteinDistance(a, b) {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 0; i < a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i + 1;

    for (let j = 0; j < b.length; j++) {
      const saved = previous[j + 1];
      const substitutionCost = a[i] === b[j] ? 0 : 1;

      previous[j + 1] = min(
        previous[j + 1] + 1,
        previous[j] + 1,
        diagonal + substitutionCost,
      );

      diagonal = saved;
    }
  }

  return previous[b.length];
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
  line(CW / 2, 225, CW / 2, CH - 42);
  noStroke();

  drawTitlePanel();
}

function drawLoadingScreen() {
  drawTitlePanel();
  drawFootball(CW / 2, CH / 2, min(56, max(34, min(CW, CH) * 0.07)));
}

function drawTitlePanel() {
  const boxW = min(CW - 40, 780);
  const boxH = 172;
  const boxX = CW / 2 - boxW / 2;
  const boxY = 82;

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
  text("ATTENDANCE", CW / 2, 152);
  text("WORLD CUP", CW / 2, 214);
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

function drawBracketRounds() {
  const finalRound = ROUND_GROUPS.length >= 4 ? ROUND_GROUPS[ROUND_GROUPS.length - 1] : null;
  const sideRounds = finalRound ? ROUND_GROUPS.slice(0, -1) : ROUND_GROUPS;
  const barWidth = min(150, max(104, CW * 0.095));
  const barHeight = min(76, max(58, CH * 0.078));
  const gap = 6;
  const matchGap = 12;
  const outerPad = 10;
  const centerReserve = min(330, max(230, CW * 0.2));
  const sideAvailable = (CW - centerReserve) / 2;
  const roundStep =
    sideRounds.length > 1
      ? max(0, (sideAvailable - outerPad - barWidth) / (sideRounds.length - 1))
      : 0;

  sideRounds.forEach((group, roundIndex) => {
    const splitAt = ceil(group.matches.length / 2);
    const leftMatches = group.matches.slice(0, splitAt);
    const rightMatches = group.matches.slice(splitAt);
    const visualIndex = roundIndex;
    const leftX = outerPad + visualIndex * roundStep;
    const rightEdgeX = CW - outerPad - visualIndex * roundStep;

    drawSideAt(leftMatches, leftX, true, barWidth, barHeight, gap, matchGap, 185, CH - 210);
    drawSideAt(rightMatches, rightEdgeX, false, barWidth, barHeight, gap, matchGap, 185, CH - 210);
  });

  if (finalRound && finalRound.matches.length > 0) {
    drawFinalRound(finalRound, barWidth, barHeight, gap);
  }
}

function drawRoundLabel(label, x, y) {
  fill(255);
  noStroke();
  textFont("Lexend");
  textSize(16);
  textStyle(BOLD);
  textAlign(CENTER);
  text(label, x, y);
  textStyle(NORMAL);
}

function drawFinalRound(group, barWidth, barHeight, gap) {
  const finalWidth = min(170, max(barWidth, CW * 0.105));
  const x = CW / 2 - finalWidth / 2;
  const finalTeams = group.matches
    .map((match) => ({ team: match.t1, score: match.s1, match }))
    .slice(0, 2);
  const totalHeight = finalTeams.length * barHeight + max(0, finalTeams.length - 1) * gap;
  const startY = CH / 2 - totalHeight / 2;

  drawRoundLabel(`FINAL`, CW / 2, startY - 14);

  finalTeams.forEach((entry, index) => {
    const y = startY + index * (barHeight + gap);
    const focused = entry.match.id === focusMatch;
    teamBar(x, y, finalWidth, barHeight, entry.team, entry.score, true, false, false, focused);
  });
}

function drawWinnersBanner() {
  const winners = getCurrentWinners();

  if (winners.length === 0) {
    return;
  }

  const bannerH = 58;
  const y = CH - bannerH - 16;
  const label = winners.length === 1 ? "WINNER" : "WINNERS";
  const names = winners.map((entry) => `${teamName(entry.team)} (${formatAttendance(entry.score)})`).join("   |   ");

  drawingContext.shadowColor = "rgba(0, 0, 0, 0.7)";
  drawingContext.shadowBlur = 18;
  drawingContext.shadowOffsetX = 0;
  drawingContext.shadowOffsetY = 5;
  fill(0, 0, 0, 220);
  noStroke();
  rect(20, y, CW - 40, bannerH, 6);
  drawingContext.shadowColor = "transparent";
  drawingContext.shadowBlur = 0;
  drawingContext.shadowOffsetX = 0;
  drawingContext.shadowOffsetY = 0;

  fill(255, 215, 40);
  textFont("Lexend");
  textStyle(BOLD);
  textAlign(CENTER);
  textSize(13);
  text(label, CW / 2, y + 19);

  fill(255);
  textSize(19);
  text(names, CW / 2, y + 43);
  textStyle(NORMAL);
}

function getCurrentWinners() {
  const groups = ROUND_GROUPS.length > 0 ? ROUND_GROUPS : [{ matches: ALL_MATCHES }];
  const finalGroup = groups[groups.length - 1];

  if (!finalGroup || finalGroup.matches.length === 0) {
    return [];
  }

  const entries = finalGroup.matches
    .flatMap(getMatchTeams)
    .filter((entry) => !isBlankTeam(entry.team) && entry.score !== "");

  if (entries.length < 2) {
    return [];
  }

  const topScore = max(entries.map((entry) => float(entry.score)));

  return entries.filter((entry) => float(entry.score) === topScore);
}

function getMatchTeams(match) {
  if (match.threeTeamMatch) {
    return match.teams;
  }

  if (match.finalEntry) {
    return [{ team: match.t1, score: match.s1 }];
  }

  return [
    { team: match.t1, score: match.s1 },
    { team: match.t2, score: match.s2 },
  ];
}

function formatAttendance(score) {
  const value = float(score);
  return Number.isNaN(value) ? "--" : `${value.toFixed(1)}%`;
}

function drawSideAt(matches, edgeX, isLeft, barWidth, barHeight, gap, matchGap, topY, availableH) {
  const totalHeight =
    matches.reduce((sum, match) => sum + matchHeight(match, barHeight, gap), 0) +
    max(0, matches.length - 1) * matchGap;
  const startY = topY + max(0, (availableH - totalHeight) / 2);
  let y = startY;

  matches.forEach((match) => {
    const winner = getWinner(match);
    const hasScores = match.s1 !== "" && match.s2 !== "";
    const t1Wins = !match.threeTeamMatch && hasScores && winner === match.t1;
    const t2Wins = !match.threeTeamMatch && hasScores && winner === match.t2;
    const focused = match.id === focusMatch;
    const x = isLeft ? edgeX : edgeX - barWidth;

    if (match.threeTeamMatch) {
      drawThreeTeamMatch(x, y, barWidth, barHeight, gap, match, isLeft, focused);
    } else {
      teamBar(x, y, barWidth, barHeight, match.t1, match.s1, isLeft, t1Wins, t2Wins, focused);
      teamBar(x, y + barHeight + gap, barWidth, barHeight, match.t2, match.s2, isLeft, t2Wins, t1Wins, focused);
    }
    drawBracketConnector(edgeX, y, barHeight, gap, barWidth, isLeft, match);
    y += matchHeight(match, barHeight, gap) + matchGap;
  });
}

function drawThreeTeamMatch(x, y, barWidth, barHeight, gap, match, isLeft, focused) {
  const scoredEntries = match.teams.filter((entry) => entry.score !== "" && !Number.isNaN(float(entry.score)));
  const topScore = scoredEntries.length > 0 ? max(scoredEntries.map((entry) => float(entry.score))) : null;

  match.teams.forEach((entry, index) => {
    const isWin = topScore !== null && float(entry.score) === topScore;
    const isLose = topScore !== null && !isWin && entry.score !== "";

    teamBar(
      x,
      y + index * (barHeight + gap),
      barWidth,
      barHeight,
      entry.team,
      entry.score,
      isLeft,
      isWin,
      isLose,
      focused,
    );
  });
}

function matchHeight(match, barHeight, gap) {
  return match.threeTeamMatch ? barHeight * 3 + gap * 2 : barHeight * 2 + gap;
}

function drawSide(matches, edgeX, isLeft) {
  const barHeight = 64;
  const gap = 8;
  const matchGap = 24;
  const barWidth = min(170, max(120, CW * 0.12));
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
    drawBracketConnector(edgeX, y, barHeight, gap, barWidth, isLeft, match);
  });
}

function drawBracketConnector(edgeX, y, barHeight, gap, barWidth, isLeft, match) {
  const cx = isLeft ? edgeX + barWidth + 1 : edgeX - barWidth - 1;
  const y1 = y + barHeight / 2;
  const y2 = y + barHeight + gap + barHeight / 2;
  const middleY = (y1 + y2) / 2;
  const arm = 16;
  const dir = isLeft ? 1 : -1;

  const connectorColour = getMatchConnectorColour(match);
  stroke(connectorColour.r, connectorColour.g, connectorColour.b, 190);
  strokeWeight(2);
  noFill();

  line(cx, y1, cx + arm * dir, y1);
  line(cx + arm * dir, y1, cx + arm * dir, middleY);
  line(cx, y2, cx + arm * dir, y2);
  line(cx + arm * dir, y2, cx + arm * dir, middleY);
  line(cx + arm * dir, middleY, cx + arm * 2 * dir, middleY);

  noStroke();
}

function getMatchConnectorColour(match) {
  const team = match && match.t1 && !isBlankTeam(match.t1) ? match.t1 : null;
  const houseColour = team ? HC[team.h] : null;

  if (!houseColour) {
    return { r: 192, g: 190, b: 184 };
  }

  return hexToRgb(houseColour.f);
}

function teamBar(x, y, w, h, team, score, isLeft, isWin, isLose, focused) {
  if (team && team.h === "BYE") {
    fill(0, 0, 0, 190);
    stroke(255, 215, 40, 150);
    strokeWeight(1.4);
    rect(x, y, w, h, 6);
    fill(255, 215, 40);
    noStroke();
    textSize(min(18, max(12, w * 0.12)));
    textStyle(BOLD);
    textAlign(CENTER);
    text("BYE", x + w / 2, y + h / 2 + 5);
    textStyle(NORMAL);
    return;
  }

  if (isBlankTeam(team)) {
    fill(20, 20, 20, 175);
    stroke(255, 255, 255, 70);
    strokeWeight(1.2);
    rect(x, y, w, h, 6);
    noStroke();
    return;
  }

  const houseColour = HC[team.h] || { f: "#cccccc", t: "#444444" };
  const fillColour = hexToRgb(houseColour.f);
  const textColour = hexToRgb(houseColour.t);
  const alpha = isLose ? 111 : 255;

  fill(fillColour.r, fillColour.g, fillColour.b, isLose ? 117 : 221);
  stroke(fillColour.r, fillColour.g, fillColour.b, isLose ? 120 : 245);
  strokeWeight(2);
  rect(x, y, w, h, 6);

  const percent = scoreToFillPercent(score);
  const fillWidth = round(w * percent);

  if (fillWidth > 0) {
    fill(fillColour.r, fillColour.g, fillColour.b, alpha);
    noStroke();
    if (isLeft) {
      rect(x, y, fillWidth, h, 6);
    } else {
      rect(x + w - fillWidth, y, fillWidth, h, 6);
    }
  }

  if (isWin) {
    noFill();
    stroke(255, 215, 40, 235);
    strokeWeight(3);
    rect(x + 2, y + 2, w - 4, h - 4, 7);
    stroke(255, 255, 255, 120);
    strokeWeight(1.2);
    rect(x + 5, y + 5, w - 10, h - 10, 5);
    noStroke();
  }

  if (focused) {
    const pulse = 0.5 + 0.5 * sin(animFrame * 0.14);
    noFill();
    stroke(fillColour.r, fillColour.g, fillColour.b, round(110 + 110 * pulse));
    strokeWeight(3);
    rect(x - 2, y - 2, w + 4, h + 4, 8);
    noStroke();
  }

  drawHouseLogo(x, y, w, h, team, score, isLeft);
  drawYearBadge(x, y, w, h, team, score, isLeft, fillColour, textColour);
}

function scoreToFillPercent(score) {
  if (score === "") {
    return 0;
  }

  const value = float(score);
  if (Number.isNaN(value)) {
    return 0;
  }

  const visibleScores = getVisibleScores();
  if (visibleScores.length < 2) {
    return constrain(value / 100, 0, 1);
  }

  const minScore = min(visibleScores);
  const maxScore = max(visibleScores);
  const range = maxScore - minScore;

  if (range < 0.01) {
    return 0.8;
  }

  const normalised = constrain((value - minScore) / range, 0, 1);
  return 0.2 + normalised * 0.8;
}

function getVisibleScores() {
  const scores = [];

  if (ROUND_GROUPS.length > 1) {
    ROUND_GROUPS.forEach((group) => {
      group.matches.forEach((match) => {
        if (match.threeTeamMatch) {
          match.teams.forEach((entry) => {
            const value = float(entry.score);
            if (entry.score !== "" && !Number.isNaN(value)) {
              scores.push(value);
            }
          });
          return;
        }

        [match.s1, match.s2].forEach((score) => {
          const value = float(score);
          if (score !== "" && !Number.isNaN(value)) {
            scores.push(value);
          }
        });
      });
    });

    return scores;
  }

  ALL_MATCHES.forEach((match) => {
    [match.s1, match.s2].forEach((score) => {
      const value = float(score);
      if (score !== "" && !Number.isNaN(value)) {
        scores.push(value);
      }
    });
  });

  return scores;
}

function drawHouseLogo(x, y, w, h, team, score, isLeft) {
  const logo = houseLogos[team.h];

  if (!logo || logo.width <= 0) {
    return;
  }

  const size = h * 0.8;
  const logoX = isLeft ? x + size / 2 : x + w - size / 2;
  const logoY = y + h / 2;

  push();
  imageMode(CENTER);
  drawingContext.shadowColor = "rgba(0, 0, 0, 0.28)";
  drawingContext.shadowBlur = 5;
  drawingContext.shadowOffsetY = 2;
  image(logo, logoX, logoY, size, size);
  drawingContext.shadowColor = "transparent";
  drawingContext.shadowBlur = 0;
  drawingContext.shadowOffsetY = 0;
  pop();
}

function drawYearBadge(x, y, w, h, team, score, isLeft, fillColour, textColour) {
  const labelX = isLeft ? x + w - 10 : x + 10;

  fill(textColour.r, textColour.g, textColour.b);
  textSize(min(22, max(16, h * 0.4)));
  textStyle(BOLD);
  textAlign(isLeft ? RIGHT : LEFT, CENTER);

  if (team.h !== "BYE") {
    text(`Y${team.yr}`, labelX, y + h / 2 - 9);
  }

  if (score !== "") {
    fill(255, 255, 255, 240);
    textSize(min(13, max(10, h * 0.2)));
    textStyle(NORMAL);
    text(`${formatAttendanceLabel(score)}%`, labelX, y + h / 2 + 11);
  }
}

function formatAttendanceLabel(score) {
  const value = float(score);

  if (Number.isNaN(value)) {
    return String(score).trim();
  }

  return value.toFixed(1);
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
  if (isBlankTeam(team)) {
    return "";
  }

  if (team.h === "BYE") {
    return "BYE";
  }

  return `Y${team.yr} ${team.h}`;
}

function getWinner(match) {
  if (match.threeTeamMatch) {
    return null;
  }

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
