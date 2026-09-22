import Image, { ImageProps } from "next/image";

export default function MogenImage({ ...props }: ImageProps) {
  return <Image {...props} />;
}
