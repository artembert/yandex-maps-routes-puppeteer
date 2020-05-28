import * as puppeteer from "puppeteer";
import { LaunchOptions, Page, Response } from "puppeteer";
import { promises } from "fs";
import * as path from "path";
import { filePaths } from "./file-paths";
import { RawRoute, Route, RouteWithID } from "./interfaces/route";

const [moscowCenterLon, moscowCenterLat] = [55.748914, 37.612586];
const browserParams: LaunchOptions = {
  headless: false,
  defaultViewport: {
    width: 1229,
    height: 768,
  },
  devtools: false,
  args: [`--window-size=1229,891`, `--window-position=281,182`],
};
const routes: RouteWithID[] = [];

class GlobalCounter {
  private value: number = 1;
  public get index() {
    return this.value;
  }
  public increase(): void {
    this.value++;
  }
}

const globalCounter = new GlobalCounter();

(async () => {
  const browser = await puppeteer.launch(browserParams);
  const departureCoordinates = await getDepartureCoordinates();
  console.log(`Departure points count: ${departureCoordinates.length}`);
  for (const [id, coordinates] of departureCoordinates) {
    console.log(`[${globalCounter.index}] Start new route #${id} from [${coordinates}]`);
    await new Promise(async resolve => {
      const page = await browser.newPage();
      await page.goto(getQueryParams(coordinates));
      await changeRouteDirection(page);
      const timeoutID = setTimeout(async () => {
        console.log(`[${globalCounter.index}] Time out #${id}`);
        console.error(`[${globalCounter.index}] Time out #${id}`);
        await saveFailedIDs(id, `Time out`);
        globalCounter.increase();
        await page.close();
      }, 10000);
      page.on("close", () => {
        clearTimeout(timeoutID);
        page.removeAllListeners();
        resolve();
      });
      page.on("response", response => handleResponse(response, id, page));
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
    moscowCenterLon +
    "%2C" +
    moscowCenterLat +
    "~" +
    departureLon +
    "%2C" +
    departureLat +
    "&rtn=1" +
    "&rtt=auto" +
    "&ruri=~&z=9"
  );
}

async function handleResponse(response: Response, id: number, page: puppeteer.Page): Promise<Route | false> {
  const req = response.request();
  if (!req.url().includes("buildRoute?")) {
    return false;
  }
  try {
    const body = (await response.json()) as any;
    const route = { ...(body.data.routes[0] as RawRoute), gridCellId: id };
    delete route.encodedCoordinates;
    delete route.paths;
    delete route.bounds;
    console.log(
      JSON.stringify(
        {
          id: route.gridCellId,
          distance: route.distance.text,
          durationWithoutTraffic: route.duration,
          durationWithTraffic: route.durationInTraffic,
          traffic: route.durationInTraffic - route.duration,
        },
        undefined,
        4,
      ),
    );
    if (!isRouteValid(route)) {
      console.log(`[${globalCounter.index}] Invalid Direction #${id}`);
      console.error(`[${globalCounter.index}] Invalid Direction #${id}`);
      await saveFailedIDs(id, `Invalid Direction`);
    } else {
      routes.push(route as RouteWithID);
      await saveRoutes(route as RouteWithID);
      console.log(`[${globalCounter.index}] Route #${id} saved to ${filePaths.routesPartials}`);
    }
  } catch (e) {
    console.log(`[${globalCounter.index}] Can\`t parse response from route #${id}\n`, e, `\n`);
    console.error(`[${globalCounter.index}] Can\`t parse response from route #${id}\n`, e, `\n`);
    await saveFailedIDs(id, `Failed to parse response`);
  }
  globalCounter.increase();
  await page.close();
}

async function changeRouteDirection(page: Page): Promise<void> {
  await page.click(".route-form-view__reverse-icon");
}

async function saveRoutes(route: RouteWithID): Promise<void> {
  await promises.appendFile(path.join(__dirname, filePaths.routesPartials), JSON.stringify(route, undefined, 4));
}

async function saveFailedIDs(id: number, message: string): Promise<void> {
  await promises.appendFile(path.join(__dirname, filePaths.failedIDs), `${id} [${message}], \n`);
}

async function getDepartureCoordinates(): Promise<DepartureItem[]> {
  return JSON.parse(
    (await promises.readFile(path.join(__dirname, filePaths.departureCoordinates))).toString("utf8"),
  ) as DepartureItem[];
}

function isRouteValid(route: Route): boolean {
  return (
    route.refPointsLineCoordinates[1][0].toFixed(2) === moscowCenterLat.toFixed(2) &&
    route.refPointsLineCoordinates[1][1].toFixed(2) === moscowCenterLon.toFixed(2)
  );
}

export type DepartureItem = [number, [number, number]];
