export type RequestData<Payload = void> = {
  id: string;
  payload: Payload;
};

export type ResponseData<Payload = void, ErrorPayload extends object | void = void> =
  | { id: string; success: true; error: null; payload: Payload }
  | { id: string; success: false; error: string; payload?: ErrorPayload };
