import {
  CreatePositionEvent,
  RemovePositionEvent,
} from "@invariant-labs/sdk-eclipse/lib/market";

export interface IActive {
  event: CreatePositionEvent;
}
export interface IClosed {
  events: [CreatePositionEvent | null, RemovePositionEvent];
}
export interface IPositions {
  active: IActive[];
  closed: IClosed[];
}
