import { useState, useEffect, useRef } from "react";
import Container from "./Container";
import { API } from "aws-amplify";
import { List } from "antd";
import checkUser from "./checkUser";

function Main() {
  const [state, setState] = useState<{ products: any[]; loading: boolean }>({
    products: [],
    loading: true,
  });
  const [user, updateUser] = useState<null | Record<string, any>>(null);
  let didCancel = useRef(false);
  useEffect(() => {
    getProducts();
    checkUser(updateUser);
    return function cleanup() {
      didCancel.current = true;
    };
  }, []);
  async function getProducts() {
    const data = await API.get("ecommerceapi", "/products", null);
    console.log("data: ", data);
    if (didCancel.current) return;
    setState({
      products: data.data.Items as any[],
      loading: false,
    });
  }
  async function deleteItem(id: string) {
    try {
      const products = state.products.filter((p) => p.id !== id);
      setState({ ...state, products });
      await API.del("ecommerceapi", "/products", { body: { id } });
      console.log("successfully deleted item");
    } catch (err) {
      console.log("error: ", err);
    }
  }
  console.log({ user });
  return (
    <Container>
      <List
        itemLayout="horizontal"
        dataSource={state.products}
        loading={state.loading}
        renderItem={(item) => (
          <List.Item
            actions={
              user?.isAuthorized
                ? [
                    <p onClick={() => deleteItem(item.id)} key={item.id}>
                      delete
                    </p>,
                  ]
                : undefined
            }
          >
            <List.Item.Meta title={item.name.S} description={item.price.S} />
          </List.Item>
        )}
      />
    </Container>
  );
}

export default Main;
