import DateTimeFormatOptions = Intl.DateTimeFormatOptions;

const formatOptions: DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
};

const startTime = formatDate(new Date(Date.now()));

export function formatDate(date: Date): string {
  const intlDate = new Intl.DateTimeFormat("default", formatOptions).format(date);
  return intlDate
    .replace(/:/g, `.`)
    .replace(/\//g, `.`)
    .replace(/, /g, `-`);
}

export const filePaths = {
  routesPartials: `../data/routes/routes-partials-${startTime}.json`,
  routesCommon: `../data/routes/routes-common-${startTime}.json`,
  failedIDs: `../data/failed-ids/failed-ids-${startTime}.txt`,
  departureCoordinates: "../data/departure-coordinates.json",
};
