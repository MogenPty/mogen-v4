import Image, { ImageProps } from "next/image";

export default function MogenImage({ ...props }: ImageProps) {
  // eslint-disable-next-line jsx-a11y/alt-text -- passthrough wrapper; callers provide alt
  return <Image {...props} />;
}
