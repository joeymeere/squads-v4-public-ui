"use client";
import { useState } from "react";
import * as bs58 from "bs58";
import * as multisig from "@sqds/multisig";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  clusterApiUrl,
} from "@solana/web3.js";
import { toast } from "sonner";
import { simulateEncodedTransaction } from "@/lib/transaction/simulateEncodedTransaction";
import { importTransaction } from "@/lib/transaction/importTransaction";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/primitives/dialog";
import { Input } from "../ui/primitives/input";
import { Button } from "../ui/primitives/button";

type CreateTransactionProps = {
  rpcUrl: string | null;
  multisigPda: string;
  vaultIndex: number;
  programId?: string;
};

const CreateTransaction = ({
  rpcUrl,
  multisigPda,
  vaultIndex,
  programId,
}: CreateTransactionProps) => {
  const wallet = useWallet();

  const [tx, setTx] = useState("");
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);

  const connection = new Connection(rpcUrl || clusterApiUrl("mainnet-beta"), {
    commitment: "confirmed",
  });

  const getSampleMessage = async () => {
    let memo = "Hello from Solana land!";
    const vaultAddress = multisig.getVaultPda({
      index: vaultIndex,
      multisigPda: new PublicKey(multisigPda),
      programId: programId ? new PublicKey(programId) : multisig.PROGRAM_ID,
    })[0];

    const dummyMessage = new TransactionMessage({
      instructions: [
        new TransactionInstruction({
          keys: [
            {
              pubkey: wallet.publicKey as PublicKey,
              isSigner: true,
              isWritable: true,
            },
          ],
          data: Buffer.from(memo, "utf-8"),
          programId: new PublicKey(
            "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
          ),
        }),
      ],
      payerKey: vaultAddress,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    }).compileToLegacyMessage();

    const encoded = bs58.default.encode(dummyMessage.serialize());

    setTx(encoded);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="h-10 px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
        Import Transaction
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Transaction</DialogTitle>
          <DialogDescription>
            Propose a transaction from a base58 encoded transaction message (not
            a transaction).
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-2">
          <label htmlFor="tx-label" className="font-medium">
            Transaction Label
          </label>
          <Input
            placeholder="Transaction label..."
            type="text"
            name="tx-label"
            defaultValue={label}
            max={32}
            onChange={(e) => setLabel(e.target.value)}
          />
          {label.length > 32 && (
            <p className="text-xs text-red-500">
              Label must be less than 32 characters.
            </p>
          )}
        </div>
        <div className="flex flex-col space-y-2">
          <label htmlFor="encoded-tx" className="font-medium">
            Encoded Transaction
          </label>
          <Input
            placeholder="Paste base58 encoded transaction..."
            type="text"
            name="encoded-tx"
            defaultValue={tx}
            onChange={(e) => setTx(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center justify-end">
          <Button
            onClick={() =>
              toast.promise(
                simulateEncodedTransaction(tx, connection, wallet),
                {
                  id: "simulation",
                  loading: "Building simulation...",
                  success: "Simulation successful.",
                  error: (e) => `${e}`,
                }
              )
            }
          >
            Simulate
          </Button>
          <Button
            onClick={() =>
              toast.promise(
                importTransaction(
                  tx,
                  connection,
                  multisigPda,
                  programId!,
                  vaultIndex,
                  wallet,
                  label
                ),
                {
                  id: "transaction",
                  loading: "Building transaction...",
                  success: () => {
                    setOpen(false);
                    return "Transaction proposed.";
                  },
                  error: (e) => `Failed to propose: ${e}`,
                }
              )
            }
          >
            Import
          </Button>
        </div>
        <button
          onClick={() => getSampleMessage()}
          className="flex justify-end text-xs underline text-stone-400 hover:text-stone-200 cursor-pointer"
        >
          Click to use a sample memo for testing
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTransaction;
