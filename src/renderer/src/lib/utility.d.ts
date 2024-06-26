// Mark only the specified properties as required
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
