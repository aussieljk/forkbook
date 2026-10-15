// CSS modules export their class names.
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
