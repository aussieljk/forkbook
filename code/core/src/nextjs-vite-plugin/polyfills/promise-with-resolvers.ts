if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = <T>(): {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    // biome-ignore lint/suspicious/noExplicitAny: any is needed for the reject function
    reject: (reason?: any) => void;
  } => {
    // The Promise executor runs at once, so it assigns both.
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  };
}
