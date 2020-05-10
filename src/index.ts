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
const routes: RouteParams[] = [];
let counter = 1;

(async () => {
  const browser = await puppeteer.launch(browserParams);
  const departureCoordinates = await getDepartureCoordinates();
  console.log(`Departure points count: ${departureCoordinates.length}`);
  for (const [id, coordinates] of departureCoordinates) {
    console.log(`[${counter}] Start new route id [${id}] from [${coordinates}]`);
    await new Promise(async resolve => {
      const page = await browser.newPage();
      await page.goto(getQueryParams(coordinates));
      await changeRouteDirection(page);
      await changeRouteDirection(page);
      page.on("response", response => handleResponse(response, id, page));
      counter++;
      page.on("close", () => resolve());
    });
  }
  await promises.writeFile(path.join(__dirname, filePaths.routesCommon), JSON.stringify(routes, undefined, 4));
  console.log(`\nCommon routes list saved to ${filePaths.routesCommon}`);
  await browser.close();
  process.exit(0);
})();

function getQueryParams([departureLat, departureLon]: [number, number]): string {
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

async function handleResponse(response: Response, id: number, page: puppeteer.Page): Promise<RouteParams | false> {
  const req = response.request();
  if (!req.url().includes("buildRoute?")) {
    return false;
  }
  try {
    const body = (await response.json()) as any;
    const route = { ...body.data.routes[0], gridCellId: id };
    delete route.encodedCoordinates;
    delete route.paths;
    delete route.bounds;
    console.log(
      JSON.stringify(
        {
          distance: route.distance.text,
          duration: route.duration,
          durationInTraffic: route.durationInTraffic,
          difference: route.duration - route.durationInTraffic,
        },
        undefined,
        4,
      ),
    );
    routes.push(route as RouteParams);
    await saveRoutes(route as RouteParams);
    console.log(`Route saved to ${filePaths.routesPartials}`);
    await page.close();
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

async function getDepartureCoordinates(): Promise<DepartureItem[]> {
  return JSON.parse(
    (await promises.readFile(path.join(__dirname, filePaths.departureCoordinates))).toString("utf8"),
  ) as DepartureItem[];
}

export type RouteParams = any;
export type DepartureItem = [number, [number, number]];
