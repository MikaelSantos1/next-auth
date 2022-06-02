import axios, { AxiosError } from "axios";
import { Router } from "next/router";
import { parseCookies, setCookie, destroyCookie } from "nookies";
import { signOut } from "../contexts/AuthContext";

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestQueue = [];
interface AxiosErrorResponse {
  code?: string;
}
export const api = axios.create({
  baseURL: "http://localhost:3333",
  headers: {
    Authorization: `Bearer ${cookies["nextauth.token"]}`,
  },
});
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<AxiosErrorResponse>) => {
    if (error.response.status === 401) {
      if (error.response.data?.code === "token.expired") {
        cookies = parseCookies();

        const { "nextauth.refreshToken": refreshToken } = cookies;

        const originalConfig = error.config;

        if (!isRefreshing) {
          isRefreshing = true;

          api
            .post("/refresh", { refreshToken })
            .then((response) => {
              const { token } = response.data;

              setCookie(undefined, "nextauth.token", token, {
                maxAge: 60 * 60 * 24 * 30, //30days
                path: "/",
              });
              setCookie(
                undefined,
                "nextauth.refreshToken",
                response.data.refreshToken,
                {
                  maxAge: 60 * 60 * 24 * 30, //30days
                  path: "/",
                }
              );

              api.defaults.headers["Authorization"] = `Bearer ${token}`;

              failedRequestQueue.forEach((request) => {
                return request.onSuccess(token);
              });
              failedRequestQueue = [];
            })
            .catch((err) => {
              failedRequestQueue.forEach((request) => {
                return request.onFailed(err);
              });
              failedRequestQueue = [];
            })
            .finally(() => {
              isRefreshing = false;
            });
        }

        return new Promise((resolve, reject) => {
          failedRequestQueue.push({
            onSuccess: (token: string) => {
              originalConfig.headers["Authorization"] = `Bearer ${token}`;
              resolve(api(originalConfig));
            },
            onFailed: (err: AxiosError) => {
              reject(err);
            },
          });
        });
      } else {
        signOut()
      }
    }
    return  Promise.reject(error)
});
