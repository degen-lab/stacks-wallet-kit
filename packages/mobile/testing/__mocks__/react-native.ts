export const Platform = {
  OS: 'ios',
  select: <T>(specifics: { ios?: T; android?: T; default?: T }) =>
    specifics.ios ?? specifics.default,
}
