export interface ReadTheme {
  name: string;
  color?: string;
  bgColor?: string;
  bgImage?: string;
  bgRepeat?:
    | 'no-repeat'
    | 'repeat'
    | 'repeat-x'
    | 'repeat-y'
    | 'round'
    | 'space';
  bgSize?: 'auto' | 'cover' | 'contain';
}
