import { useState, ChangeEvent } from "react";
import "./App.css";
import { Input, Button } from "antd";

import { API } from "aws-amplify";
import { withAuthenticator } from "aws-amplify-react";

const initialState = {
  name: "",
  price: "",
};

function Admin() {
  const [itemInfo, updateItemInfo] = useState(initialState);
  function updateForm(e: ChangeEvent<HTMLInputElement>) {
    const formData = {
      ...itemInfo,
      [e.target.name]: e.target.value,
    };
    updateItemInfo(formData);
  }
  async function addItem() {
    try {
      const data = {
        body: { ...itemInfo, price: itemInfo.price },
      };
      updateItemInfo(initialState);
      await API.post("ecommerceapi", "/products", data);
    } catch (err) {
      console.log("error adding item...");
    }
  }
  console.log({ itemInfo });
  return (
    <div style={containerStyle}>
      <Input
        name="name"
        onChange={updateForm}
        value={itemInfo.name}
        placeholder="Item name"
        style={inputStyle}
      />
      <Input
        name="price"
        onChange={updateForm}
        value={itemInfo.price}
        style={inputStyle}
        placeholder="item price"
      />
      <Button style={buttonStyle} onClick={addItem}>
        Add Product
      </Button>
    </div>
  );
}

const containerStyle = {
  width: 400,
  margin: "20px auto",
};

const inputStyle = {
  marginTop: 10,
};

const buttonStyle = {
  marginTop: 10,
};

export default withAuthenticator(Admin);
