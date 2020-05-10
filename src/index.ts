import * as puppeteer from "puppeteer";
import { LaunchOptions, Page, Response } from "puppeteer";
import { promises } from "fs";
import * as path from "path";
import { filePaths } from "./file-paths";

const [moscowCenterLon, moscowCenterLat] = [55.748914, 37.612586];
const browserParams: LaunchOptions = {
  headless: false,
  defaultViewport: {
    width: 1024,
    height: 768,
  },
  devtools: true,
  args: [`--window-size=1578,891`, `--window-position=460,222`],
};

(async () => {
  const browser = await puppeteer.launch(browserParams);
  const page = await browser.newPage();
  // await page.goto("https://yandex.ru/maps/?ll=37.578087%2C55.723876&z=9");
  await page.goto(getQueryParams([56.024122, 36.587356]));
  await changeRouteDirection(page);
  await changeRouteDirection(page);
  page.on("response", response => handleResponse(response, browser));
})();

function getQueryParams([departureLon, departureLat]: [number, number]): string {
  return (
    "https://yandex.ru/maps/?ll=" +
    moscowCenterLat +
    "%2C" +
    moscowCenterLon +
    "&mode=routes" +
    "&routes%5Bavoid%5D=tolls" +
    "&routes%5BtimeDependent%5D%5Btime%5D=2019-12-12T08%3A00%3A00" +
    "&rtext=" +
    departureLon +
    "%2C" +
    departureLat +
    "~" +
    moscowCenterLon +
    "%2C" +
    moscowCenterLat +
    "&rtn=1" +
    "&rtt=auto" +
    "&ruri=~&z=9"
  );
}

async function handleResponse(response: Response, browser: puppeteer.Browser): Promise<RouteParams | false> {
  const req = response.request();
  if (!req.url().includes("buildRoute?")) {
    return false;
  }
  try {
    const body = (await response.json()) as any;
    const route = { ...body.data.routes[0] };
    delete route.encodedCoordinates;
    delete route.paths;
    delete route.bounds;
    console.log(JSON.stringify(route, undefined, 4));
    await saveRoutes(route as RouteParams);
    console.log(`Route saved to ${filePaths.routesPartials}`);
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error("Cant parse response\n", e);
    process.exit(1);
  }
}

async function changeRouteDirection(page: Page): Promise<void> {
  await page.click(".route-form-view__reverse-icon");
}

async function saveRoutes(route: RouteParams) {
  await promises.appendFile(path.join(__dirname, filePaths.routesPartials), JSON.stringify(route, undefined, 4));
}

export type RouteParams = any;
