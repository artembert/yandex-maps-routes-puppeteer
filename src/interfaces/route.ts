export interface Route {
  uuid: string;
  type: string;
  refPointsLineCoordinates: [[number, number], [number, number]];
  constructions: any[];
  distance: Distance;
  duration: number;
  durationInTraffic: number;
  flags: Flags;
  matchFilter: boolean;
  gridCellId: number;
}

export interface Distance {
  value: number;
  text: string;
}

export interface Flags {
  blocked: boolean;
  hasTolls: boolean;
  hasFerries: boolean;
  crossesBorders: boolean;
  requiresAccessPass: boolean;
  futureBlocked: boolean;
  deadJam: boolean;
  hasRuggedRoads: boolean;
}

export interface RouteWithID extends Route {
  gridCellId: number;
}

export interface RawRoute extends Route {
  encodedCoordinates: any;
  paths: any;
  bounds: any;
}
