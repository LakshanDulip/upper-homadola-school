import type {NextConfig} from "next";
const pages = process.env.GITHUB_PAGES === "true";
const config: NextConfig = {output:"export",trailingSlash:true,images:{unoptimized:true},basePath:pages?"/upper-homadola-school":"",assetPrefix:pages?"/upper-homadola-school/":undefined};
export default config;
