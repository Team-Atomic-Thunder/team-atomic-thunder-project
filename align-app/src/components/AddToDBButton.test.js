import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AddToDBButton from './AddToDBButton';
import { collection, getDocs, where, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from 'src/firebase-config';

async function deleteCollection(collectionName) {
    try {
        const collectionRef = collection(db, collectionName);
        const querySnapshot = await getDocs(query(collectionRef));
        if (querySnapshot.empty) {
            console.log("Collection is empty");
            return;
        }
        const deletePromises = querySnapshot.docs.map((document) => {
            return deleteDoc(doc(db, collectionName, document.id));
        });
        await Promise.all(deletePromises);
       
    } catch(error) {
        console.error("Error deleting collection: ", error);
    }
}

describe("AddToDBButton Tests", () => {
    test("AddToDBButton renders without crashing", () => {
        render(<AddToDBButton/>);
        const buttonElement = screen.getByText(/Add to DB/i);
        expect(buttonElement).toBeInTheDocument();
    });

    test("AddToDBButton adds a new document to the database", async () => {
        await deleteCollection("user");
        render(<AddToDBButton/>);
        const buttonElement = screen.getByText(/Add to DB/i);
        fireEvent.click(buttonElement);
        const q = query(collection(db, "user"), where("First", "==", "Meghann"));
        const querySnapshot = await getDocs(q);
        expect(querySnapshot.size).toBe(1);
    });
});