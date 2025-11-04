// Chrome Extension API type definitions
declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      tab?: {
        id: number;
      };
      frameId?: number;
    }

    interface LastError {
      message?: string;
    }

    function sendMessage(
      message: any,
      responseCallback?: (response: any) => void
    ): void;

    const onMessage: {
      addListener(
        callback: (
          request: any,
          sender: MessageSender,
          sendResponse: (response?: any) => void
        ) => void | boolean
      ): void;
      removeListener(
        callback: (
          request: any,
          sender: MessageSender,
          sendResponse: (response?: any) => void
        ) => void | boolean
      ): void;
    };

    function getURL(path: string): string;

    const id: string;
    const lastError: LastError | undefined;
  }

  namespace storage {
    interface StorageArea {
      get(
        keys: string | string[] | null | { [key: string]: any } | null,
        callback?: (items: { [key: string]: any }) => void
      ): void;
      set(items: { [key: string]: any }, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
    }

    const local: StorageArea;
  }
}

