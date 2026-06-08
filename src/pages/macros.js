export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/dashboard",
      permanent: false,
    },
  };
}

export default function MacrosRedirect() {
  return null;
}
