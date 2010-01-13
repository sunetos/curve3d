package 
{
	import flash.display.Sprite;
	import flash.filesystem.File;
	import flash.filesystem.FileMode;
	import flash.filesystem.FileStream;
	import flash.net.FileReference;
	import flash.text.TextField;
	import flash.utils.ByteArray;
	import flash.utils.Endian;
	
	/**
	 * Writes a pile of binary data to files on the desktop to test bytearrays.
	 * 
	 * @author Adam R. Smith
	 */
	public class Main extends Sprite 
	{
		protected var output:TextField = null;
		
		public function Main():void 
		{
			output = new TextField();
			output.width = stage.stageWidth;
			output.height = stage.stageHeight;
			stage.addChild(output);
			
			writeBytes();
			readBytes();
		}
		
		protected function log(data:Object):void
		{
			output.appendText(data.toString() + '\n');
		}
		
		protected function writeBytes():void
		{
			var file:File, stream:FileStream, ba:ByteArray;
			
			var endianInfos:Array = [
				  {endian: Endian.BIG_ENDIAN, filename: 'bigendian.blob', name: 'Big Endian' }
				, {endian: Endian.LITTLE_ENDIAN, filename: 'littleendian.blob', name: 'Little Endian' }
			];
			for each (var endianInfo:Object in endianInfos) {
				ba = new ByteArray();
				ba.endian = endianInfo['endian'];
				
				ba.writeBoolean(true);
				ba.writeBoolean(false);
				ba.writeByte(126);
				ba.writeShort(31001);
				ba.writeShort(-31001);
				ba.writeUnsignedInt(8333481);
				ba.writeInt(3874329);
				ba.writeInt(-3874329);
				ba.writeFloat(Math.PI);
				ba.writeFloat(-Math.PI);
				ba.writeDouble(Math.PI);
				ba.writeDouble(-Math.PI);
				ba.writeDouble(0.0000000007);
				ba.writeDouble(-0.0000000007);
				ba.writeDouble(934839483947.89789797);
				ba.writeDouble( -934839483947.89789797);
				ba.writeUTFBytes('monkey1');
				ba.writeByte(0);
				ba.writeUTFBytes('monkey2');
				ba.writeByte(0);
				
				file = File.desktopDirectory.resolvePath(endianInfo['filename']);
				stream = new FileStream();
				stream.open(file, FileMode.WRITE);
				stream.writeBytes(ba);
				stream.close();
			}
		}
		
		protected function readBytes():void
		{
			var file:File, stream:FileStream, ba:ByteArray;
			
			var endianInfos:Array = [
				  {endian: Endian.BIG_ENDIAN, filename: 'bigendian.blob', name: 'Big Endian' }
				, {endian: Endian.LITTLE_ENDIAN, filename: 'littleendian.blob', name: 'Little Endian' }
			];
			for each (var endianInfo:Object in endianInfos) {
				file = File.desktopDirectory.resolvePath(endianInfo['filename']);
				stream = new FileStream();
				stream.open(file, FileMode.READ);
				ba = new ByteArray();
				stream.readBytes(ba, 0, stream.bytesAvailable);
				
				ba.endian = endianInfo['endian'];
				log(endianInfo['name']);
				log(ba.readBoolean());
				log(ba.readBoolean());
				log(ba.readByte());
				log(ba.readShort());
				log(ba.readShort());
				log(ba.readUnsignedInt());
				log(ba.readInt());
				log(ba.readInt());
				log(ba.readFloat());
				log(ba.readFloat());
				log(ba.readDouble());
				log(ba.readDouble());
				log(ba.readDouble());
				log(ba.readDouble());
				log(ba.readDouble());
				log(ba.readDouble());
				
				log('');
			}
		}
		
	}
	
}