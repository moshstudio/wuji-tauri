import { showFailToast } from 'vant';

export function toProxyUrl(url?: string | undefined | null): string {
  if (!url) return '';
  return url;
  // return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}
export function maxPageNoFromElements(
  elements?: NodeListOf<Element> | null,
  onlyKeepNumbers = true,
): number | null {
  if (!elements) return null;

  function keepOnlyNumbers(input: string): string {
    // 保留数字、小数点、负号、加号、科学计数法符号
    return input.replace(/[^\d.\-]/g, '');
  }

  const res = Math.max(
    ...Array.from(elements.values())
      .map((el) =>
        Number(
          onlyKeepNumbers
            ? keepOnlyNumbers(el.textContent || '')
            : el.textContent,
        ),
      )
      .filter((v) => !isNaN(v)),
  );
  if (res === Infinity || res === -Infinity) return null;
  return res;
}

export function parseAndExecuteHtml(
  htmlString: string,
  baseUrl?: string,
): Promise<HTMLIFrameElement> {
  if (baseUrl) {
    htmlString = htmlString.replace(
      /<head>/,
      `<head><base href="${baseUrl}" />`,
    );
  }
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const iframeDocument =
      iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDocument) {
      iframeDocument.open();
      iframeDocument.write(htmlString);
      iframeDocument.close();

      resolve(iframe);
    } else {
      console.log('Failed to load iframe document');

      reject(new Error('Failed to load iframe document'));
    }

    iframe.onerror = () => {
      reject(new Error('Failed to load iframe'));
      // 清理 iframe
      document.body.removeChild(iframe);
    };

    // 3秒后移除
    // setTimeout(() => {
    //   // 清理 iframe
    //   document.body.removeChild(iframe);
    //   // reject(new Error('Timeout'));
    // }, 3000);
  });
}

export function tryCatchProxy<T extends object>(target: T): T {
  // 递归处理原型链
  function proxyPrototype(proto: any) {
    if (!proto) return;
    const propertyNames = Object.getOwnPropertyNames(proto);
    propertyNames.forEach((name) => {
      let condition = false;
      try {
        if (
          name !== 'constructor' &&
          proto[name] &&
          typeof proto[name] === 'function'
        ) {
          condition = true;
        }
      } catch (error) {}
      if (condition) {
        const originalMethod = proto[name];
        proto[name] = function (...args: any[]) {
          try {
            return originalMethod.apply(this, args);
          } catch (e) {
            console.warn(`Error in ${originalMethod}:`, e);
            showFailToast(`${proto.name} 请求失败`);
          }
        };
      }
    });
  }
  proxyPrototype(Object.getPrototypeOf(target));

  return new Proxy(target, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);
      if (typeof originalMethod === 'function') {
        return function (...args: any[]) {
          const result = originalMethod.apply(target, args);
          if (result instanceof Promise) {
            return result.catch((e) => {
              // console.warn(`Error in ${originalMethod}:`, e);
            });
          } else {
            try {
              return result;
            } catch (e) {
              console.warn(`Error in ${originalMethod}:`, e);
            }
          }
        };
      }
      return originalMethod;

      // const originalMethod = target[prop as keyof T];
      // if (typeof originalMethod === "function") {
      //   return function (...args: any[]) {
      //     try {
      //       return originalMethod.apply(target, args);
      //     } catch (error) {
      //       if (onError) {
      //         onError(error);
      //       } else {
      //         console.error(`Error in ${String(prop)}:`, error);
      //       }
      //     }
      //   };
      // }
      // return Reflect.get(target, prop, receiver);
    },
  });
}
